import { connection as Connection } from "websocket"
import { IFrontendResponse, IFrontendRequest, IRunningActionInfo, IClientRegisterInfo } from "../../common/types"
import { verifyIDToken } from "./functions"
import { spawn, IPty, IPtyForkOptions } from "node-pty"
import { homedir, EOL } from "os"

export const DEFAULT_SHELL = process.env.COMSPEC || process.env.SHELL

interface IRunningAction {
    name: string,
    label: string,
    process: IPty,
    history: string[],
    subscribed: string[]
}

interface IAction {
    name: string,
    command: string,
    cwd: string,
    env: { [index: string]: string }
    label: string
}

var runningActions = {} as { [index: string]: IRunningAction }
var activeSessions = {} as { [index: string]: UserSession }

export async function startRuntime() {
    console.log("Starting runtime...")

    setInterval(() => {
        Object.values(activeSessions).forEach(v => v.sendRunningActions())
    }, 1000)
}

export async function startAction(context: string, action: IAction) {
    var process = spawn(DEFAULT_SHELL, [], {
        cwd: action.cwd,
        env: {...action.env, ...global.process.env},
        cols: 145,
        rows: 30
    })

    process.write(action.command + "& exit" + EOL)

    var runningAction = {
        history: [],
        name: context + "/" + action.name,
        process,
        label: action.label,
        subscribed: []
    } as IRunningAction

    var onOut = (data) => {
        var chunk = data.toString()
        runningAction.history.push(chunk)

        runningAction.subscribed.forEach(v => {
            activeSessions[v]?.sendActionUpdate(runningAction.name, chunk)
        })
    }

    process.on("data", onOut)

    process.on("exit", () => {
        delete runningActions[runningAction.name]
        Object.values(activeSessions).forEach(v => v.sendRunningActions())
    })

    runningActions[runningAction.name] = runningAction

    Object.values(activeSessions).forEach(v => v.sendRunningActions())
}

export class UserSession {
    public subscribedTo = null as string
    public verified = false

    constructor(public connection: Connection, public registerInfo: IClientRegisterInfo) {
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

                    if (this.verified) {
                        if (request.listRunning) {
                            Object.assign(response, this.getRunningActionsRespose())
                        }

                        if (request.startTerminal) {
                            let actionId = ""
                            do {
                                actionId = Math.random().toString().substr(2)
                            } while ("_terminal/" + actionId in runningActions)

                            startAction("_terminal", {
                                command: DEFAULT_SHELL,
                                name: actionId,
                                cwd: homedir(),
                                env: {},
                                label: "Terminal"
                            })
                        }
                        
                        if (request.quickCommand) {
                            let actionId = request.quickCommand
                            while ("_quick/" + actionId in runningActions) {
                                actionId = Math.random().toString().substr(2)
                            }
    
                            startAction("_quick", {
                                command: request.quickCommand,
                                name: actionId,
                                cwd: homedir(),
                                env: {},
                                label: request.quickCommand
                            })
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
                            target.process.kill()
                            Object.values(activeSessions).forEach(v => v.sendRunningActions())
                        }

                        if (request.sendInput) {
                            var target = runningActions[request.sendInput.id]
                            if (!target) {
                                sendError(`Requested running action ${request.sendInput.id} to write to not found`)
                                return
                            }
                            
                            target.process.write(request.sendInput.data)
                        }
                    }

                    if (request.idToken) {
                        verifyIDToken(registerInfo, request.idToken).then(v => {
                            if (v.valid) {
                                this.verified = true
                                connection.send(JSON.stringify({ verified: true } as IFrontendResponse))
                                this.sendRunningActions()
                            }
                        })
                    }

                    connection.send(JSON.stringify(response))
                }
            } else {
                sendError("Wrong message type, only utf8 supported")
            }
        })
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
        return { runningActions: Object.keys(runningActions).map(v => ({ label: runningActions[v].label, id: v } as IRunningActionInfo)) } as IFrontendResponse
    }

    sendRunningActions() {
        if (this.verified) this.connection.send(JSON.stringify(this.getRunningActionsRespose()))
    }

    sendActionUpdate(id: string, line: string) {
        if (this.verified) this.connection.send(JSON.stringify({ actionTerminalOut: { id, line } } as IFrontendResponse))
    }
}