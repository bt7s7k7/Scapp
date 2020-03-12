import { getRegisterData } from "./config";
import { registerClient, getConfig } from "./functions";
import { hostname } from "os";

getRegisterData().then(async registerInfo => {
    var config = await getConfig(registerInfo)

    console.log(config)
})