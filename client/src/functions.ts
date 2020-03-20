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
        // The local emulator uses http and deploied function uses https
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
                    reject(new Error(dataFragments.join("") || `Error ${message.statusCode} ${message.statusMessage}\n ${message.rawHeaders.map(v => "  " + v).join("\n")}`))
            })
        })

        clientRequest.write(JSON.stringify(data))

        clientRequest.on("error", (err) => {
            reject(err)
        })

        clientRequest.end()
    })
}

export function registerClient(name: string, owner: string): Promise<IClientRegisterInfo> {
    return executeFunctionRaw("registerClient", { name, owner })
}

const CLIENT_NOT_REG_ERROR = new Error("This client has not been registered yet, run scapp init to register")

export function getConfig(info: IClientRegisterInfo): Promise<IClientDocument> {
    if (!info.id || !info.accessToken) return Promise.reject(CLIENT_NOT_REG_ERROR)
    return executeFunctionRaw("getClientConfig", info)
}

export function deleteClient(info: IClientRegisterInfo): Promise<IClientDocument> {
    if (!info.id || !info.accessToken) return Promise.reject(CLIENT_NOT_REG_ERROR)
    return executeFunctionRaw("deleteClient", info)
}

export function rename(info: IClientRegisterInfo, name: string): Promise<void> {
    if (!info.id || !info.accessToken) return Promise.reject(CLIENT_NOT_REG_ERROR)
    return executeFunctionRaw("renameClient", {
        ...info,
        name
    })
}

export function changeAllowedUsers(info: IClientRegisterInfo, add: string[], remove: string[]) {
    if (!info.id || !info.accessToken) return Promise.reject(CLIENT_NOT_REG_ERROR)
    return executeFunctionRaw("changeClientAllowedUsers", {
        ...info,
        add,
        remove
    })
}

export function setNgrokUrl(info: IClientRegisterInfo, url: string) {
    if (!info.id || !info.accessToken) return Promise.reject(CLIENT_NOT_REG_ERROR)
    return executeFunctionRaw("setClientUrl", {
        ...info,
        url
    })
}

export function verifyIDToken(info: IClientRegisterInfo, token: string): Promise<{ valid: boolean, reason: string }> {
    if (!info.id || !info.accessToken) return Promise.reject(CLIENT_NOT_REG_ERROR)
    return executeFunctionRaw("verifyUserToken", {
        ...info,
        token
    })
}