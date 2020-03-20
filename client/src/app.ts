#!/usr/bin/env node
import { getLocalConfig, resetLocalConfig, saveLocalConfig } from "./config";
import { getConfig, rename, changeAllowedUsers, setNgrokUrl, registerClient, deleteClient } from "./functions";
import { createInterface } from "readline";
import { connect } from "ngrok";
import { createServer } from "http";
import { AddressInfo } from "net";
import { server as WebSocketServer } from "websocket";
import { WEBSOCKET_PROTOCOL, IAction } from "../../common/types";
import { parse, format } from "url";
import { UserSession, startRuntime, RESTART_EXIT_CODE, log, scanTasks, tasks, RESTART_AND_WAIT_EXIT_CODE } from "./runtime";
import { spawn } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import { inspect } from "util";
import { hostname } from "os";

(async () => {
    var commands = {
        "allowed": {
            args: 0,
            callback: async () => {
                var localConfig = await getLocalConfig()
                var config = await getConfig(localConfig)
                log(config.allowedUsers.join("\n"))
            },
            desc: "allowed             - Get userids of allowed users"
        },
        "id": {
            args: 0,
            callback: async () => {
                var localConfig = await getLocalConfig()
                log(localConfig.id)
            },
            desc: "id                  - Returns the id of this client"
        },
        "token": {
            args: 0,
            callback: async () => {
                var localConfig = await getLocalConfig()
                log(localConfig.accessToken)
            },
            desc: "token               - Returns the access token of this client"
        },
        "allow": {
            args: 1,
            callback: async ([name]) => {
                var localConfig = await getLocalConfig()
                await changeAllowedUsers(localConfig, [name], [])
                log(`User allowed`)
            },
            desc: "allow <userid>      - Allows the userid access to this client"
        },
        "disallow": {
            args: 1,
            callback: async ([name]) => {
                var localConfig = await getLocalConfig()
                await changeAllowedUsers(localConfig, [], [name])
                log(`User disallowed`)
            },
            desc: "disallow <userid>   - Removes the userid from allowed users"
        },
        "reset": {
            args: 0,
            callback: async () => {
                var config = await getLocalConfig()
                await deleteClient(config)
                log(`Deleted the client from the database`)
                await resetLocalConfig()
                log(`Reset local config`)
            },
            desc: "reset               - Deletes all settings and removes the client from the database"
        },
        "name": {
            args: 0,
            callback: async () => {
                var localConfig = await getLocalConfig()
                var config = await getConfig(localConfig)
                log(config.name)
            },
            desc: "name                - Returns the name of this client"
        },
        "rename": {
            args: 1,
            desc: "rename <name>       - Changes the name of this client",
            callback: async ([name]) => {
                var localConfig = await getLocalConfig()
                await rename(localConfig, name)
                log(`Client renamed`)
            }
        },
        "_run_direct": {
            args: 0,
            desc: "",
            callback: async () => {
                var localConfig = await getLocalConfig()
                var server = createServer((request, response) => {
                    response.end("This is a websocket port");
                })

                await startRuntime(localConfig)

                server.listen(0, async () => {
                    try {
                        var port = (server.address() as AddressInfo).port
                        log(`Server listening on port ${port}`)

                        var websocketServer = new WebSocketServer({
                            httpServer: server
                        })

                        log("Websocket started")

                        websocketServer.on("request", request => {
                            var canAccept = request.requestedProtocols.indexOf(WEBSOCKET_PROTOCOL) != -1
                            if (!canAccept) {
                                request.reject(404, "No supported protocol")
                            } else {
                                var connection = request.accept(WEBSOCKET_PROTOCOL)
                                new UserSession(connection, localConfig)
                            }
                        })

                        var startTime = Date.now()

                        var url = await connect({
                            addr: port,
                            onStatusChange: (status) => {
                                if (status == "closed") {
                                    log(`Connection lost`)
                                    process.exit(RESTART_AND_WAIT_EXIT_CODE)
                                }
                            },
                            onLogEvent: (msg) => {
                                if (msg.includes("a successful ngrok tunnel session has not yet been established") && Date.now() - startTime > 10000) {
                                    log(`Failed to connect`)
                                    process.exit(RESTART_AND_WAIT_EXIT_CODE)
                                }
                            }
                        })

                        var wsUrl = parse(url)

                        wsUrl.protocol = "wss"

                        log(`ngrok connected, url is ${url}, formated as ${format(wsUrl)}`)
                        await setNgrokUrl(localConfig, format(wsUrl))

                        log("URL is now set in remote")
                    } catch (err) {
                        console.error(err)
                        debugger
                        process.exit(1)
                    }
                })
            }
        },
        "run": {
            args: 0,
            desc: "run                 - Starts ngrok and websocket host, brings the client online",
            callback() {
                return new Promise((resolve, reject) => {
                    var start = () => {
                        var child = spawn(process.argv[0], [process.argv[1], "_run_direct"], {
                            stdio: "inherit"
                        })

                        child.on("close", (code) => {
                            if (code == RESTART_EXIT_CODE) {
                                log("\n-- Restart --\n")
                                start()
                            } else if (code == RESTART_AND_WAIT_EXIT_CODE) {
                                log("\n-- Restarting in 1m --\n")
                                setTimeout(()=>{
                                    start()
                                }, 1000 * 60)
                            } else {
                                resolve()
                            }
                        })

                        child.on("error", (err) => {
                            console.error(err)
                            debugger
                            process.exit(1)
                        })
                    }

                    start()
                })
            }
        },
        version: {
            args: 0,
            desc: "version             - Prints the version",
            callback() {
                var packageData = JSON.parse(readFileSync(join(__dirname, "../../../package.json")).toString())
                var version = packageData.version
                log(version)
            }
        },
        register: {
            args: 1,
            desc: "register <path>     - Registers the path as a task",
            async callback([path]) {
                var localConfig = await getLocalConfig()
                var absolutePath = join(process.cwd(), path)
                if (!localConfig.taskPaths.includes(absolutePath)) localConfig.taskPaths.push(absolutePath)
                await saveLocalConfig(localConfig)
                log(`Path registered`)
            }
        },
        unregister: {
            args: 1,
            desc: "unregister <path>   - Registers the path as a task",
            async callback([path]) {
                var localConfig = await getLocalConfig()
                var absolutePath = join(process.cwd(), path)
                if (localConfig.taskPaths.includes(absolutePath)) localConfig.taskPaths.splice(localConfig.taskPaths.indexOf(absolutePath), 1)
                await saveLocalConfig(localConfig)
                log(`Path unregistered`)
            }
        },
        registered: {
            args: 0,
            desc: "registered          - Prints all registered tasks",
            async callback() {
                var localConfig = await getLocalConfig()
                log(localConfig.taskPaths.join("\n"))
            }
        },
        "path": {
            args: 1,
            desc: "path <path>         - Sets the clone path",
            async callback([path]) {
                var localConfig = await getLocalConfig()
                var absolutePath = join(process.cwd(), path)
                localConfig.clonePath = absolutePath
                await saveLocalConfig(localConfig)
                log(`Clone path set`)
            }
        },
        "config": {
            args: 0,
            desc: "config              - Prints the current config",
            async callback() {
                var localConfig = await getLocalConfig()
                log(Object.keys(localConfig).filter(v => v != "accessToken").map(v => v + ": " + inspect(localConfig[v], { colors: true })).join("\n"))
            }
        },
        init: {
            args: 1,
            desc: "init <ownerId>      - Registers this client with the database allowing it to be controlled by the owner",
            async callback([id]) {
                var info = await registerClient(hostname(), id)
                await saveLocalConfig(Object.assign(await getLocalConfig(), info))
                log(`Registered successfully as "${hostname()}"`)
            }
        },
        "delete": {
            args: 0,
            desc: "delete              - Deltes this client from the database",
            async callback() {
                var config = await getLocalConfig()
                await deleteClient(config)
                log(`Successfully deleted the client, run scapp init to register it again`)
            }
        },
        "startup": {
            args: 1,
            desc: "startup <action>    - Sets the action as a startup action",
            async callback([action]) {
                var config = await getLocalConfig()

                if (!config.startupActions.includes(action)) {
                    await scanTasks(config)

                    var actions = [] as string[]

                    Object.values(tasks).forEach(v => v.actions.forEach(w => actions.push(v.id + "@" + w.name)))

                    if (!actions.includes(action)) log(`Action "${action}" does not exist`)
                    else {
                        config.startupActions.push(action)
                        await saveLocalConfig(config)
                        log(`Action "${action}" set as startup action`)
                    }
                }
                else return log(`Action "${action}" is already set as startup action`)
            }
        },
        "unstartup": {
            args: 1,
            desc: "unstartup <action>  - Removes the action from startup actions",
            async callback([action]) {
                var config = await getLocalConfig()
                if (config.startupActions.includes(action)) config.startupActions.splice(config.startupActions.indexOf(action), 1)
                else return log(`Action ${action} is not set as startup action`)
                await saveLocalConfig(config)
                log(`Action "${action}" removed from startup actions`)
            }
        },
        "actions": {
            args: 0,
            desc: "actions             - Prints the registered actions",
            async callback() {
                var config = await getLocalConfig()
                await scanTasks(config)

                Object.values(tasks).forEach(task => {
                    log(task.label + (task.label == task.id ? "" : " ~ " + task.id))

                    var prefixes = {} as { [index: string]: (IAction & { globalId: string })[] }

                    task.actions.forEach((v: IAction) => {
                        var split = v.name.lastIndexOf("/")
                        var prefix = v.name.substr(0, split)

                        if (!(prefix in prefixes)) prefixes[prefix] = []
                        prefixes[prefix].push({ ...v, globalId: task.id + "@" + v.name })
                    })

                    Object.entries(prefixes).forEach(([prefix, actions]) => {
                        if (prefix != "") log(`| ` + prefix)
                        actions.forEach(v => log(`| | ` + v.label + " ~ " + v.globalId))
                    })
                })
            }
        }
    } as { [index: string]: { args: number, callback: (args: string[]) => any, desc: string } }

    var runCommand = async (commandName: string, args: string[]) => {
        if (commandName in commands) {
            var command = commands[commandName]
            if (command.args != args.length) {
                console.error(`Wrong amount of arguments, expected ${command.args}, got ${args.length}`)
                console.error(command.desc)
            } else {
                let ret = command.callback(args)
                if (ret instanceof Promise) {
                    await ret
                }
            }
        } else {
            log("Commands:\n" + Object.keys(commands).filter(v => v[0] != "_").map(v => "  " + commands[v].desc).join("\n"))
        }
    }

    if (process.argv.length != 2) {
        let commandName = process.argv[2]
        let args = process.argv.slice(3);

        if (commandName == "startup" || commandName == "unstartup") args = [args.join(" ")]

        await runCommand(commandName, args).catch(errorCatcher)
    } else {
        var repl = createInterface(process.stdin, process.stdout)

        repl.on("line", (line) => {
            if (line == "") return
            var tokens = line.split(" ")
            if (tokens[0] == "startup" || tokens[0] == "unstartup") {
                tokens[1] = tokens.slice(1).join(" ")
                tokens.length = 2
            }
            runCommand(tokens[0], tokens.slice(1)).catch(errorCatcher)
        })
    }
})().catch(errorCatcher)

var errorCatcher = err => {
    if (err instanceof Error) {
        if (err.message == "Document not found") {
            console.error(`The database document for this client was not found. It was probably deleted from the website. Run "scapp reset" to fix this problem.`)
        } else {
            debugger
            console.error(err.message)
        }
    } else {
        console.error(err)
    }
}