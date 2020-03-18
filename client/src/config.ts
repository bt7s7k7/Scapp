import { hostname, homedir } from "os"
import { join } from "path"
import { readFile, writeFile } from "fs"
import { registerClient } from "./functions"
import { IClientLocalConfig } from "../../common/types"

export const CONFIG_PATH = join(homedir(), ".scapp.json")

export function saveLocalConfig(config: IClientLocalConfig) {
    return new Promise<void>((resolve, reject) => {
        writeFile(CONFIG_PATH, JSON.stringify(config), (err) => {
            if (err) reject(err)
            else {
                resolve()
            }
        })
    })
}

export async function resetLocalConfig() {
    let registerInfo = await registerClient(hostname())

    let config = Object.assign(getDefaultConfig(), registerInfo) as IClientLocalConfig

    saveLocalConfig(config)
    return config
}

function getDefaultConfig(): IClientLocalConfig {
    return {
        taskPaths: [],
        clonePath: join(homedir(), "scapp"),
        accessToken: "",
        id: ""
    }
}

export function getLocalConfig() {
    return new Promise<IClientLocalConfig>((resolve, reject) => {
        readFile(CONFIG_PATH, async (err, data) => {
            if (err) {
                if (err.code == "ENOENT") {
                    resetLocalConfig().then(config => resolve(config)).catch(err => reject(err))
                } else {
                    reject(err)
                }
            } else {
                let config = null as IClientLocalConfig
                try {
                    config = JSON.parse(data.toString())
                } catch (err) {
                    return reject(err)
                }
                config = Object.assign(getDefaultConfig(), config)

                resolve(config)
            }
        })
    })
}