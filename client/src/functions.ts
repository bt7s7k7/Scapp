import { request as httpsRequest } from "https"
import { request as httpRequest } from "http"
import { IClientRegisterInfo, IClientDocument } from "../../common/types"
import { parse } from "url"

var functionsURL = null as string

function getFunctionsURL() {
    return new Promise<string>((resolve, reject) => {
        if ("EMULATOR_PORT" in process.env) {
            resolve(`http://localhost:${process.env.EMULATOR_PORT}/system-control-app/us-central1/`)
        } else {
            resolve("https://us-central1-system-control-app.cloudfunctions.net/")
        }
    })
}

export function executeFunctionRaw(name: string, data: any) {
    return new Promise<any>(async (resolve, reject) => {

        if (functionsURL == null) {
            functionsURL = await getFunctionsURL()
        }

        const parsedUrl = parse(functionsURL + name)
        var requestType = parsedUrl.protocol == "http:" ? httpRequest : httpsRequest

        var clientRequest = requestType({
            ...parsedUrl,
            headers: {
                "Content-Type": "application/json",
            },
            method: "POST"
        }, (message) => {
            var dataFragments = []

            message.on("data", data => {
                dataFragments.push(data)
            })

            message.on("end", () => {
                if (message.statusCode == 200)
                    resolve(JSON.parse(dataFragments.join("")))
                else
                    reject(dataFragments.join("") || `Error ${message.statusCode} ${message.statusMessage}\n ${message.rawHeaders.map(v => "  " + v).join("\n")}`)
            })
        })

        clientRequest.write(JSON.stringify(data))

        clientRequest.on("error", (err) => {
            reject(err)
        })

        clientRequest.end()
    })
}

export function registerClient(name: string): Promise<IClientRegisterInfo> {
    return executeFunctionRaw("registerClient", { name })
}

export function getConfig(info: IClientRegisterInfo): Promise<IClientDocument> {
    return executeFunctionRaw("getClientConfig", info)
}

export function rename(info: IClientRegisterInfo, name: string): Promise<void> {
    return executeFunctionRaw("renameClient", {
        ...info,
        name
    })
}

export function changeAllowedUsers(info: IClientRegisterInfo, add: string[], remove: string[]) {
    return executeFunctionRaw("changeClientAllowedUsers", {
        ...info,
        add,
        remove
    })
}

export function setNgrokUrl(info: IClientRegisterInfo, url: string) {
    return executeFunctionRaw("setClientUrl", {
        ...info,
        url
    })
}