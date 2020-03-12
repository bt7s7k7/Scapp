import { hostname, homedir } from "os"
import { join } from "path"
import { readFile, writeFile } from "fs"
import { registerClient } from "./functions"
import { IClientRegisterInfo, IClientDocument, IClientLocalConfig } from "../../common/types"

export const CONFIG_PATH = join(homedir(), ".systemcontrol.json")

export function saveRegisterData(config: IClientLocalConfig) {
    return new Promise<void>((resolve, reject) => {
        writeFile(CONFIG_PATH, JSON.stringify(config), (err) => {
            if (err) reject(err)
            else {
                resolve()
            }
        })
    })
}

export async function resetRegisterData() {
    let registerInfo = await registerClient(hostname())

    let config = Object.assign({

    } as IClientLocalConfig, registerInfo) as IClientLocalConfig

    saveRegisterData(config)
    return config
}

export function getLocalConfig() {
    return new Promise<IClientLocalConfig>((resolve, reject) => {
        readFile(CONFIG_PATH, async (err, data) => {
            if (err) {
                if (err.code == "ENOENT") {
                    resetRegisterData().then(config => resolve(config)).catch(err => reject(err))
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
                config = Object.assign(config)

                resolve(config)
            }
        })
    })
}