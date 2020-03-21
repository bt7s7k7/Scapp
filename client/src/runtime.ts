import { connection as Connection } from "websocket"
import { IFrontendResponse, IFrontendRequest, IRunningActionInfo, IClientRegisterInfo, IClientLocalConfig, ITask, IAction } from "../../common/types"
import { verifyIDToken } from "./functions"
import { spawn, IPty } from "node-pty"
import { homedir, EOL, hostname, networkInterfaces } from "os"
import { readdir, readFile, appendFile, mkdir } from "fs"
import { inspect } from "util"
import { join, basename, resolve as pathResolve } from "path"
import * as datauri from "datauri"
import { saveLocalConfig } from "./config"

export const RESTART_EXIT_CODE = 50214
export const RESTART_AND_WAIT_EXIT_CODE = 50215

export const DEFAULT_SHELL = process.env.COMSPEC || process.env.SHELL

interface IRunningAction {
    name: string,
    label: string,
    process: IPty,
    history: string[],
    subscribed: string[],
    exitCode: number,
    file: string
}

interface ITaskConfig {
    label: string,
    actions: IAction[],
    import: string[],
    icon: string
}

function makeLogPath(id: string) {
    var date = new Date()
    return `${id.replace(/\//g, "!")}${"`"}${Date.now()}.txt`
}

function addActionHistory(action: IRunningAction, line: string) {
    action.history.push(line)

    appendFile(join(homedir(), ".scappLogs", action.file), line, (err) => {
        if (err)
            if (err.code == "ENOENT") { // If the folder does not exist we must have not created it yet, so do that
                mkdir(join(homedir(), ".scappLogs"), (err2) => {
                    if (err2) {
                        console.error(`Failed to create log, ${err.stack}, then failed to create folder, ${err2.stack}`)
                        process.exit(RESTART_EXIT_CODE)
                    } else {
                        appendFile(join(homedir(), ".scappLogs", action.file), line, (err) => {
                            if (err) { // If there is still an error just give up
                                let msg = "Failed to write to log, " + err.stack
                                // Can't use log because it calls this function, may cause an stack overflow or worse
                                console.error(msg)
                                thisAction.history.push(msg)
                            }
                        })
                    }
                })
            } else {
                let msg = "Failed to create log directory, " + err.stack
                console.error(msg)
                thisAction.history.push(msg)
            }
    })
}
/** This action represents the scapp process, it's then viewable from the webapp */
var thisAction = {
    history: [],
    label: "Scapp log",
    name: "_internal@log",
    process: null,
    subscribed: [],
    exitCode: 0,
    file: makeLogPath("_internal@log")
} as IRunningAction
/** Custom loggin funciton to log into the webapp viewable action */
export function log(line: string) {
    console.log(line)
    addActionHistory(thisAction, line + EOL)
}

var runningActions = {
    [thisAction.name]: thisAction
} as { [index: string]: IRunningAction }
var activeSessions = {} as { [index: string]: UserSession }
export var tasks = {} as { [index: string]: ITask }
/** Scans for tasks and runs statup actions */
export async function startRuntime(config: IClientLocalConfig) {
    log("Starting runtime...")

    setInterval(() => {
        Object.values(activeSessions).forEach(v => v.sendRunningActions())
    }, 1000)
    log("Scanning tasks...")
    await scanTasks(config)

    config.startupActions.forEach((v) => {
        var [taskId, actionId] = v.split("@")

        if (taskId in tasks) {
            let task = tasks[taskId]
            let action = task.actions.filter(v => v.name == actionId)[0]
            if (action) {
                var result = startAction(taskId, action)
                if (result instanceof Error) {
                    log(`Failed to start startup action ${v}, ${result.stack}`)
                }
            } else {
                log(`Failed to start startup action ${v}, action not found`)
            }
        } else {
            log(`Failed to start startup action ${v}, task not found`)
        }
    })
}

export function scanTasks(config: IClientLocalConfig) {
    tasks = {}
    return Promise.all(config.taskPaths.map(path => new Promise((resolve, reject) => {
        var promises = [] as Promise<any>[]
        var setLabel = false

        var id = basename(path)

        while (id in tasks) {
            id = basename(path) + "_" + Math.random().toString().substr(2)
        }

        var task = {
            actions: [],
            id,
            label: basename(path),
            path,
            icon: ""
        } as ITask

        var scanDir = (scanPath: string, prefix: string) => {
            promises.push(new Promise(resolve => {

                readdir(scanPath, (err, files) => {
                    if (err) {
                        log(`Error loading files in task ${inspect(path, { colors: true })}, ${err.stack}`)
                        resolve()
                    } else {
                        // Look for files that provide actions
                        // package.json can provide actions from scripts and a label if there's none
                        if (files.includes("package.json")) {
                            promises.push(new Promise(resolve => {
                                readFile(join(scanPath, "package.json"), (err, data) => {
                                    if (err) {
                                        resolve()
                                        log(`Error reading package.json in ${inspect(scanPath, { colors: true })}, ${err.stack}`)
                                    }
                                    else {
                                        var packageData = null as any
                                        try {
                                            packageData = JSON.parse(data.toString())
                                        }
                                        catch (err) {
                                            resolve()
                                            log(`Error reading package.json in ${inspect(scanPath, { colors: true })}, ${err.stack}`)
                                        }
                                        if (packageData) {
                                            var scripts = packageData.scripts as {
                                                [index: string]: string
                                            }

                                            if (scripts) {
                                                let namePrefix = (prefix.length > 0 ? prefix + "/" : "")
                                                let transformName = (name: string) => {
                                                    let named = {
                                                        build: "Build",
                                                        serve: "Serve",
                                                        start: "Start",
                                                        deploy: "Deploy"
                                                    }

                                                    if (name in named) name = named[name]
                                                    else name = "npm run " + name
                                                    return name
                                                }
                                                Object.keys(scripts).forEach(v => task.actions.push({
                                                    command: "npm run " + v,
                                                    cwd: scanPath,
                                                    env: {},
                                                    label: transformName(v),
                                                    name: namePrefix + "npm run " + v
                                                }))
                                            }
                                            // Set the label of this task from the package.json only if it was not set by a scapp.json, it has presesence
                                            if (scanPath == path && "name" in packageData && !setLabel) {
                                                task.label = packageData.name
                                            }

                                            resolve()
                                        }
                                    }
                                })
                            }))
                        }
                        // If this is a firebase folder add an deploy action and scan
                        // for functions directory, it has a npm package.json we can use
                        if (files.includes("firebase.json")) {
                            task.actions.push({
                                command: "firebase deploy",
                                cwd: path,
                                env: {},
                                label: "Deploy firebase",
                                name: (prefix ? prefix + "/" : "") + "firebase deploy"
                            })

                            if (files.includes("functions")) {
                                scanDir(join(scanPath, "functions"), (prefix ? prefix + "/" : "") + "functions")
                            }
                        }
                        // Scapp.json is the main configuration file for scapp, it can provide a label, icon, import other folders, and actions
                        if (files.includes("scapp.json")) {
                            promises.push(new Promise((resolve, reject) => {
                                var file = join(scanPath, "scapp.json")
                                readFile(file, (err, data) => {
                                    if (err) {
                                        resolve()
                                        log(`Error reading scapp.json in ${inspect(scanPath, { colors: true })}, ${err.stack}`)
                                    }
                                    else {
                                        var taskConfig = null as ITaskConfig
                                        try {
                                            taskConfig = JSON.parse(data.toString())
                                        }
                                        catch (err) {
                                            resolve()
                                            log(`Error reading scapp.json in ${inspect(scanPath, { colors: true })}, ${err.stack}`)
                                        }

                                        if (taskConfig) {
                                            if ("actions" in taskConfig) {
                                                if (taskConfig.actions instanceof Array)
                                                    taskConfig.actions.forEach((v, i) => {
                                                        if (typeof v != "object" || v == null) { log(`${file}/action[${i}] is not an action`); return }
                                                        v = Object.assign({
                                                            cwd: scanPath,
                                                            env: {}
                                                        } as IAction, v)

                                                        if (!("label" in v)) {
                                                            // @ts-ignore TypeScript thinks this can never happen and throws
                                                            v.label = v.name
                                                        }

                                                        if (!("name" in v)) {
                                                            // @ts-ignore
                                                            v.label = v.name
                                                        }

                                                        if (typeof v.name != "string") { log(`${file}/action[${i}]/name is not string`); return }
                                                        if (typeof v.label != "string") { log(`${file}/action[${i}]/label is not string`); return }
                                                        if (typeof v.command != "string") { log(`${file}/action[${i}]/command is not string`); return }
                                                        if (typeof v.cwd != "string") { log(`${file}/action[${i}]/cwd is not string`); return }
                                                        // Make the cwd relative to the path
                                                        v.cwd = pathResolve(scanPath, v.cwd)
                                                        v.name = (prefix ? prefix + "/" : "") + v.name

                                                        task.actions.push(v)
                                                    })
                                                else log(`${file}/action is not array`)
                                            }

                                            if ("icon" in taskConfig) {
                                                if (typeof taskConfig.icon != "string") log(`${file}/icon is not string`)
                                                else if (scanPath != path) log(`${file}/icon is only allowed in root scapp.json`)
                                                else {
                                                    let iconPath = taskConfig.icon

                                                    if (iconPath.substr(0, 4) == "mdi-") { // If the icon begins with mdi- it can be a material design icon, so just keep it
                                                        task.icon = iconPath
                                                    } else { 
                                                        try {
                                                            task.icon = datauri.sync(pathResolve(scanPath, iconPath)) // Load the target file and save the dataURI
                                                        } catch (err) {
                                                            log(`${file}/icon error while loading file, ${err.stack}`)
                                                        }
                                                    }
                                                }
                                            }

                                            if ("label" in taskConfig) {
                                                if (typeof taskConfig.label != "string") log(`${file}/label is not string`)
                                                else if (scanPath != path) log(`${file}/label is only allowed in root scapp.json`)
                                                else {
                                                    task.label = taskConfig.label
                                                }
                                            }

                                            if ("import" in taskConfig) {
                                                if (taskConfig.import instanceof Array) {
                                                    taskConfig.import.forEach((v, i) => {
                                                        if (typeof v != "string") log(`${file}/import[${i}] is not string`)
                                                        else {
                                                            scanDir(join(scanPath, v), (prefix ? prefix + "/" : "") + v)
                                                        }
                                                    })
                                                }
                                                else log(`${file}/label is not string`)
                                            }
                                        }
                                        resolve()
                                    }
                                })
                            }))
                        }
                        // If it's a git directory we can pull so add that
                        if (files.includes(".git")) {
                            task.actions.push({
                                command: "git pull",
                                cwd: scanPath,
                                env: {},
                                label: "Git Pull",
                                name: (prefix ? prefix + "/" : "") + "git pull"
                            })
                        }

                        resolve()
                    }
                })
            }))
        }
        // Start the scanning process at path
        scanDir(path, "")
        // This function waits for promises, then checks if any more were pushed, if so waits again
        var wait = () => {
            var lastLength = promises.length
            Promise.all(promises).then(() => {
                if (lastLength == promises.length) {
                    tasks[task.id] = task
                    resolve()
                } else {
                    wait()
                }
            })
        }

        wait()
    }))).then(() => {
        Object.values(activeSessions).forEach(v => v.sendTasksUpdate())
    })
}

export function startAction(context: string, action: IAction) {
    try {
        var process = spawn(DEFAULT_SHELL, DEFAULT_SHELL == "/bin/bash" ? ["-c", `"${action.command}"`] : ["/c", action.command], {
            cwd: action.cwd,
            env: { ...action.env, ...global.process.env },
            cols: 145,
            rows: 30
        })
    } catch (err) {
        return err as Error
    }

    var runningAction = {
        history: [],
        name: context + "@" + action.name,
        process,
        label: action.label,
        subscribed: [],
        exitCode: 0,
        file: makeLogPath(context + "@" + action.name)
    } as IRunningAction

    var onOut = (data) => {
        var chunk = data.toString()
        addActionHistory(runningAction, chunk)

        runningAction.subscribed.forEach(v => {
            activeSessions[v]?.sendActionUpdate(runningAction.name, chunk)
        })
    }

    process.on("data", onOut)

    process.on("exit", (code) => {
        if (code == 0) {
            delete runningActions[runningAction.name]
        } else {
            runningActions[runningAction.name].exitCode = code
        }
        Object.values(activeSessions).forEach(v => v.sendRunningActions())
    })

    runningActions[runningAction.name] = runningAction

    Object.values(activeSessions).forEach(v => v.sendRunningActions())

    return null
}

export class UserSession {
    public subscribedTo = null as string
    public verified = false

    constructor(public connection: Connection, public localConfig: IClientLocalConfig, port: number) {
        var sendError = (errstring: string) => {
            connection.send(JSON.stringify({
                err: errstring
            } as IFrontendResponse))
        }
        var id = ""
        do {
            id = Math.random().toString().substr(2)
        } while (id in activeSessions)

        activeSessions[id] = this

        connection.on("message", (message) => {
            if (message.type == "utf8") {
                var request = null as IFrontendRequest
                try {
                    request = JSON.parse(message.utf8Data)
                } catch (err) {
                    sendError(err.message)
                }

                if (request) {
                    var response = {} as IFrontendResponse

                    // The webapp must send a id token to be verified with
                    // a cloud function to execute commands otherwise anyone
                    // could connect to the socket and controll the client
                    if (this.verified) { 
                        if (request.listRunning) {
                            Object.assign(response, this.getRunningActionsRespose())
                        }

                        if (request.startTerminal) {
                            let actionId = ""
                            do { // Make sure the id isn't used
                                actionId = Math.random().toString().substr(2)
                            } while ("_terminal@" + actionId in runningActions)

                            let result = startAction("_terminal", {
                                command: DEFAULT_SHELL,
                                name: actionId,
                                cwd: typeof request.startTerminal == "boolean" ? homedir() : request.startTerminal,
                                env: {},
                                label: "Terminal"
                            })

                            if (result instanceof Error) {
                                sendError(result.stack)
                                return
                            }
                        }

                        if (request.quickCommand) {
                            var label = request.quickCommand
                            var command = request.quickCommand
                            // Since commads are platfrom specific 
                            // we must select the base on the platform
                            if (command == "_exit") {
                                process.exit(0)
                            } else if (command == "_restart") {
                                process.exit(RESTART_EXIT_CODE)
                            } else if (command == "_reboot") {
                                label = "Reboot"
                                if (process.platform == "win32") {
                                    command = "shutdown /r /t 0 /f"
                                } else {
                                    command = "sudo reboot"
                                }
                            } else if (command == "_shutdown") {
                                label = "Shutdown"
                                if (process.platform == "win32") {
                                    command = "shutdown /p /f"
                                } else {
                                    command = "sudo poweroff"
                                }
                            } else if (command == "_lock") {
                                label = "Lock"
                                if (process.platform == "win32") {
                                    command = "rundll32.exe user32.dll,LockWorkStation"
                                } else {
                                    command = "DISPLAY=:0 gnome-screensaver-command -l"
                                }
                            }

                            let actionId = command
                            while ("_quick@" + actionId in runningActions) { // Make sure the id isn't used
                                actionId = Math.random().toString().substr(2)
                            }

                            let result = startAction("_quick", {
                                command,
                                name: actionId,
                                cwd: homedir(),
                                env: {},
                                label
                            })

                            if (result instanceof Error) {
                                sendError(result.stack)
                                return
                            }
                        }

                        if (request.subscribe) {
                            let target = runningActions[request.subscribe]
                            if (!target) {
                                sendError("Requested running action to subscribe to not found")
                                return
                            }

                            unsubsribe()
                            this.subscribedTo = request.subscribe
                            target.subscribed.push(id)

                            // Join the history to reduce memory fragmentation
                            // and make the packet smaller
                            target.history = [target.history.join("")] 
                            response.actionTerminalHistory = {
                                id: request.subscribe,
                                history: target.history[0]
                            }
                        }

                        if (request.killAction) {
                            var target = runningActions[request.killAction]
                            if (!target) {
                                sendError("Requested running action to kill not found")
                                return
                            }

                            delete runningActions[request.killAction]
                            if (target.process) target.process.kill()
                            Object.values(activeSessions).forEach(v => v.sendRunningActions())
                        }

                        if (request.sendInput) {
                            var target = runningActions[request.sendInput.id]
                            if (!target) {
                                sendError(`Requested running action ${request.sendInput.id} to write to not found`)
                                return
                            }

                            if (target.process) target.process.write(request.sendInput.data)
                        }

                        if (request.rescanTasks) {
                            scanTasks(localConfig)
                        }

                        if (request.startAction) {
                            if (request.startAction in runningActions) {
                                sendError(`Action ${request.startAction} is already running`)
                                return
                            }

                            let [taskId, actionId] = request.startAction.split("@")

                            if (taskId in tasks) {
                                let task = tasks[taskId]
                                let actions = task.actions.filter(v => v.name == actionId)
                                if (actions.length > 0) {
                                    let action = actions[0]

                                    let result = startAction(taskId, action)

                                    if (result instanceof Error) {
                                        sendError(result.stack)
                                        return
                                    }
                                } else {
                                    sendError(`Task with id ${taskId} was found but does not contain action ${actionId}`)
                                    return
                                }
                            } else {
                                sendError(`Task with id ${taskId} not found`)
                                return
                            }
                        }

                        if (request.getStartupActions) {
                            response.startupActions = localConfig.startupActions
                        }

                        if (request.addStartupAction) {
                            if (localConfig.startupActions.includes(request.addStartupAction)) {
                                sendError(`Action ${request.addStartupAction} is already set as startup action`)
                                return
                            }
                            var actions = [] as string[]
                            // Go thru all tasks and push their actions
                            Object.values(tasks).forEach(v => v.actions.forEach(w => actions.push(v.id + "@" + w.name)))

                            if (!actions.includes(request.addStartupAction)) {
                                sendError(`Action ${request.addStartupAction} does not exist`)
                                return
                            } else {
                                localConfig.startupActions.push(request.addStartupAction)
                                saveLocalConfig(localConfig).then(() => {
                                    Object.values(activeSessions).forEach(v => v.sendStartupActions())
                                })
                            }
                        }

                        if (request.removeStartupAction) {
                            if (localConfig.startupActions.includes(request.removeStartupAction)) localConfig.startupActions.splice(localConfig.startupActions.indexOf(request.removeStartupAction), 1)
                            else return sendError(`Action ${request.removeStartupAction} is not set as startup action`)
                            saveLocalConfig(localConfig).then(() => {
                                Object.values(activeSessions).forEach(v => v.sendStartupActions())
                            })
                        }

                        if (request.getLogs) {
                            readdir(join(homedir(), ".scappLogs"), (err, files) => {
                                if (err) {
                                    sendError(err.stack)
                                } else {
                                    connection.send(JSON.stringify({
                                        logs: files
                                    } as IFrontendResponse))
                                }
                            })
                        }

                        if (request.readLog) {
                            readFile(join(homedir(), ".scappLogs", request.readLog), (err, data) => {
                                if (err) {
                                    sendError(err.stack)
                                } else {
                                    connection.send(JSON.stringify({
                                        logContent: {
                                            id: request.readLog,
                                            content: data.toString()
                                        }
                                    } as IFrontendResponse))
                                }
                            })
                        }
                    }

                    if (request.idToken) {
                        verifyIDToken(localConfig, request.idToken).then(v => {
                            if (v.valid) {
                                this.verified = true
                                this.sendRunningActions()
                                this.sendTasksUpdate()
                                this.sendStartupActions()
                                
                                // Send a message directly, can't set the response object, because this is a callback that happends later
                                connection.send(JSON.stringify({ 
                                    verified: true,
                                    // Send local network interfaces so the webapp can transfer to a direct connection
                                    interfaces: Object.values(networkInterfaces()).map(v=>v.filter(v=>v.family == "IPv4")[0].address).map(v=>"ws://" + v + ":" + port)
                                } as IFrontendResponse))

                            }
                        })
                    }

                    connection.send(JSON.stringify(response))
                }
            } else {
                sendError("Wrong message type, only utf8 supported")
            }
        })
        /** Unsubsribe from receiving action output */
        var unsubsribe = () => {
            if (this.subscribedTo && runningActions[this.subscribedTo]) {
                let subscribed = runningActions[this.subscribedTo].subscribed
                subscribed.splice(subscribed.indexOf(id), 1)
            }
        }

        connection.on("close", () => {
            unsubsribe()
            delete activeSessions[id]
        })
    }

    getRunningActionsRespose() {
        return { runningActions: Object.keys(runningActions).map(v => ({ label: runningActions[v].label, id: v, exitCode: runningActions[v].exitCode } as IRunningActionInfo)) } as IFrontendResponse
    }

    sendRunningActions() {
        if (this.verified) this.connection.send(JSON.stringify(this.getRunningActionsRespose()))
    }

    sendActionUpdate(id: string, line: string) {
        if (this.verified) this.connection.send(JSON.stringify({ actionTerminalOut: { id, line } } as IFrontendResponse))
    }

    sendTasksUpdate() {
        if (this.verified) this.connection.send(JSON.stringify({ tasks } as IFrontendResponse))
    }

    sendStartupActions() {
        if (this.verified) this.connection.send(JSON.stringify({ startupActions: this.localConfig.startupActions } as IFrontendResponse))
    }
}