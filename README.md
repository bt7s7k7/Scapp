# Scapp [![Firebase CI/CD](https://github.com/bt7s7k7/Scapp/workflows/Firebase%20CI/CD/badge.svg)](https://scapp-web.web.app/) [![npm](https://img.shields.io/npm/v/scapp)](https://www.npmjs.com/package/scapp)
Scapp is a application used to run and manage tasks running on a client computer using a [webapp](https://scapp-web.web.app). 
## Guide
### Creating an account
Goto https://scapp-web.web.app and Sign in with Google.

![image](https://user-images.githubusercontent.com/26630940/77229423-247e3380-6b8e-11ea-9bc8-fb982613d371.png)

After signing in you can change your email and view your user id in the top right corner.

![image](https://user-images.githubusercontent.com/26630940/77229478-8e96d880-6b8e-11ea-9939-d1564bfb5e93.png)

### Creating a client
You can download the client using npm. Requires python to be installed.
````
npm i -g scapp@latest
````
Then register your client with the database
````
scapp init <your email>
````
You're able to see your clients it in the webapp.

![image](https://user-images.githubusercontent.com/26630940/77229546-0533d600-6b8f-11ea-80fb-c8a12c47596c.png)

Start the host process in online mode
````
scapp run
````
or in Lan mode
````
scapp lan <local ip to use>
````
The client's status will then change to green.
### Client interface

![image](https://user-images.githubusercontent.com/26630940/77229733-cc483100-6b8f-11ea-9261-f4297eda6cdf.png)

When a direct connection to an network interface of the client is available, you can switch to it instead of piping it through ngrok servers. This way the latency will be decreased.

Client local config is stored in `.scapp.json` file in your home directory. Logs are saved to `.scappLogs` directory in your home directory.

### Registering tasks
To register a task folder run
````
scapp register <path>
````
Scapp will check the folder for actions sources such as `package.json` or `firebase.json`. To further configure a task create a `scapp.json` file in the task folder. 
````typescript
Config {
    // Label of the task
    label: string,
    // Task actions
    actions: Action[],
    // More folders to scan
    import: string[],
    // Path to a icon file or material design icon name prefixed with mdi-
    icon: string
}

Action {
    // Name of the action
    name: string,
    // Command to run
    command: string,
    // Working directory of the action
    cwd: string,
    // Environmental variables
    env: { [index: string]: string }
    // Label for users
    label: string
}
````

### Task interface

When a task is registered restart the host process. You can see it in the client's page.

![image](https://user-images.githubusercontent.com/26630940/77229900-c30b9400-6b90-11ea-8c88-7034f1d43fb9.png)

Click on it to expand.

![image](https://user-images.githubusercontent.com/26630940/77229999-6c528a00-6b91-11ea-83aa-ed3b8baef962.png)

Startup actions will start with the host process automatically. They can be also enabled using a command
````
scapp startup <global action id>
````
Run this command to list available actions
````
scapp actions
````

### Autostart
#### Windows
Open the task scheduler. 

![image](https://user-images.githubusercontent.com/26630940/77230164-96f11280-6b92-11ea-8f7e-e93c3e338d68.png)

Goto Action/Create task...

![image](https://user-images.githubusercontent.com/26630940/77230203-d3bd0980-6b92-11ea-93ca-74708af66884.png)

Enable Run whether user is logged in or not

![image](https://user-images.githubusercontent.com/26630940/77230227-08c95c00-6b93-11ea-986c-c118ad6718d0.png)

Set the task trigger at startup

![image](https://user-images.githubusercontent.com/26630940/77230315-9e64eb80-6b93-11ea-82b4-3e4d0af16d89.png)

Set the action to start scapp

![image](https://user-images.githubusercontent.com/26630940/77230390-221ed800-6b94-11ea-9f68-51412a0b1a4d.png)

In Settings set restart if task fails. Disable stopping the task after some time and set to not start a new instance if one's running

![image](https://user-images.githubusercontent.com/26630940/77230462-9fe2e380-6b94-11ea-8bf0-daab58ca021b.png)

Click OK, login and the action is created. You can now start it manually.

![image](https://user-images.githubusercontent.com/26630940/77230483-d91b5380-6b94-11ea-80bf-07f866bc6bbb.png)


#### Linux
*todo*



