import { getRegisterData, resetRegisterData } from "./config";
import { getConfig, rename, changeAllowedUsers } from "./functions";
import { createInterface } from "readline";

getRegisterData().then(async registerInfo => {
    var commands = {
        "allowed": {
            args: 0,
            callback: async () => {
                var config = await getConfig(registerInfo)
                console.log(config.allowedUsers.join("\n"))
            },
            desc: "allowed           - Get userids of allowed users"
        },
        "id": {
            args: 0,
            callback: () => {
                console.log(registerInfo.id)
            },
            desc: "id                - Returns the id of this client"
        },
        "token": {
            args: 0,
            callback: () => {
                console.log(registerInfo.accessToken)
            },
            desc: "token             - Returns the access token of this client"
        },
        "allow": {
            args: 1,
            callback: ([name]) => {
                return changeAllowedUsers(registerInfo, [name], [])
            },
            desc: "allow <userid>    - Allows the userid access to this client"
        },
        "disallow": {
            args: 1,
            callback: ([name]) => {
                return changeAllowedUsers(registerInfo, [], [name])
            },
            desc: "disallow <userid> - Removes the userid from allowed users"
        },
        "reset": {
            args: 0,
            callback: () => {
                return resetRegisterData()
            },
            desc: "reset             - Creates a new client, with a new id, access token and no allowed users"
        },
        "name": {
            args: 0,
            callback: async () => {
                var config = await getConfig(registerInfo)
                console.log(config.name)
            }, 
            desc: "name              - Returns the name of this client"
        },
        "rename": {
            args: 1,
            desc: "rename <name>     - Changes the name of this client",
            callback: ([name])=> {
                return rename(registerInfo, name)
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
            console.log("Commands:\n" + Object.keys(commands).map(v => "  " + commands[v].desc).join("\n"))
        }
    }

    if (process.argv.length != 2) {
        let commandName = process.argv[2]
        const args = process.argv.slice(3);

        runCommand(commandName, args)
    } else {
        var repl = createInterface(process.stdin, process.stdout)

        repl.on("line", (line) => {
            if (line == "") return
            var tokens = line.split(" ")
            runCommand(tokens[0], tokens.slice(1))
        })
    }
})