import { hostname, homedir } from "os"
import { join } from "path"
import { readFile, writeFile } from "fs"
import { registerClient } from "./functions"
import { IClientRegisterInfo, IClientDocument } from "../../common/types"

export const CONFIG_PATH = join(homedir(), ".systemcontrol.json")

export function saveRegisterData(config: IClientRegisterInfo) {
    return new Promise<void>((resolve, reject) => {
        writeFile(CONFIG_PATH, JSON.stringify(config), (err)=>{
            if (err) reject(err)
            else {
                resolve()
            }
        })
    })
}

export function getRegisterData() {
    return new Promise<IClientRegisterInfo>((resolve, reject) => {
        readFile(CONFIG_PATH, async (err, data) => {
            if (err) {
                if (err.code == "ENOENT") {
                    let config = await registerClient(hostname())
                    saveRegisterData(config).then(()=>resolve(config)).catch(err=>reject(err))
                } else {
                    reject(err)
                }
            } else {
                let config = null as IClientRegisterInfo
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