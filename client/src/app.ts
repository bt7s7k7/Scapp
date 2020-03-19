#!/usr/bin/env node
import { getLocalConfig, resetLocalConfig, saveLocalConfig } from "./config";
import { getConfig, rename, changeAllowedUsers, setNgrokUrl, registerClient, deleteClient } from "./functions";
import { createInterface } from "readline";
import { connect } from "ngrok";
import { createServer } from "http";
import { AddressInfo } from "net";
import { server as WebSocketServer } from "websocket";
import { WEBSOCKET_PROTOCOL } from "../../common/types";
import { parse, format } from "url";
import { UserSession, startRuntime, RESTART_EXIT_CODE, log } from "./runtime";
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
            desc: "allowed           - Get userids of allowed users"
        },
        "id": {
            args: 0,
            callback: async () => {
                var localConfig = await getLocalConfig()
                log(localConfig.id)
            },
            desc: "id                - Returns the id of this client"
        },
        "token": {
            args: 0,
            callback: async () => {
                var localConfig = await getLocalConfig()
                log(localConfig.accessToken)
            },
            desc: "token             - Returns the access token of this client"
        },
        "allow": {
            args: 1,
            callback: async ([name]) => {
                var localConfig = await getLocalConfig()
                return changeAllowedUsers(localConfig, [name], [])
            },
            desc: "allow <userid>    - Allows the userid access to this client"
        },
        "disallow": {
            args: 1,
            callback: async ([name]) => {
                var localConfig = await getLocalConfig()
                return changeAllowedUsers(localConfig, [], [name])
            },
            desc: "disallow <userid> - Removes the userid from allowed users"
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
            desc: "reset             - Deletes all settings and removes the client from the database"
        },
        "name": {
            args: 0,
            callback: async () => {
                var localConfig = await getLocalConfig()
                var config = await getConfig(localConfig)
                log(config.name)
            },
            desc: "name              - Returns the name of this client"
        },
        "rename": {
            args: 1,
            desc: "rename <name>     - Changes the name of this client",
            callback: async ([name]) => {
                var localConfig = await getLocalConfig()
                return rename(localConfig, name)
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

                        var url = await connect({
                            addr: port,
                            onStatusChange: (status) => {
                                log(`ngrok status is now ${status}`)
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
            desc: "run               - Starts ngrok and websocket host, brings the client online",
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
            desc: "version           - Prints the version",
            callback() {
                var packageData = JSON.parse(readFileSync(join(__dirname, "../../../package.json")).toString())
                var version = packageData.version
                log(version)
            }
        },
        register: {
            args: 1,
            desc: "register <path>   - Registers the path as a task",
            async callback([path]) {
                var localConfig = await getLocalConfig()
                var absolutePath = join(process.cwd(), path)
                if (!localConfig.taskPaths.includes(absolutePath)) localConfig.taskPaths.push(absolutePath)
                saveLocalConfig(localConfig)
            }
        },
        unregister: {
            args: 1,
            desc: "unregister <path> - Registers the path as a task",
            async callback([path]) {
                var localConfig = await getLocalConfig()
                var absolutePath = join(process.cwd(), path)
                if (localConfig.taskPaths.includes(absolutePath)) localConfig.taskPaths.splice(localConfig.taskPaths.indexOf(absolutePath), 1)
                saveLocalConfig(localConfig)
            }
        },
        registered: {
            args: 0,
            desc: "registered        - Prints all registered tasks",
            async callback() {
                var localConfig = await getLocalConfig()
                log(localConfig.taskPaths.join("\n"))
            }
        },
        "path": {
            args: 1,
            desc: "path <path>       - Sets the clone path",
            async callback([path]) {
                var localConfig = await getLocalConfig()
                var absolutePath = join(process.cwd(), path)
                localConfig.clonePath = absolutePath
                saveLocalConfig(localConfig)
            }
        },
        "config": {
            args: 0,
            desc: "config            - Prints the current config",
            async callback() {
                var localConfig = await getLocalConfig()
                log(Object.keys(localConfig).filter(v => v != "accessToken").map(v => v + ": " + inspect(localConfig[v], { colors: true })).join("\n"))
            }
        },
        init: {
            args: 1,
            desc: "init <ownerId>    - Registers this client with the database allowing it to be controlled by the owner",
            async callback([id]) {
                var info = await registerClient(hostname(), id)
                saveLocalConfig(Object.assign(await getLocalConfig(), info))
                log(`Registered successfully as "${hostname()}"`)
            }
        },
        "delete": {
            args: 0,
            desc: "delete            - Deltes this client from the database",
            async callback() {
                var config = await getLocalConfig()
                await deleteClient(config)
                log(`Successfully deleted the client, run scapp init to register it again`)
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
        const args = process.argv.slice(3);

        await runCommand(commandName, args).catch(errorCatcher)
    } else {
        var repl = createInterface(process.stdin, process.stdout)

        repl.on("line", (line) => {
            if (line == "") return
            var tokens = line.split(" ")
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