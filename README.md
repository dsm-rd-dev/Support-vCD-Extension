# VCD Support UI Plugin #

## Overview ##
This is a UI Plugin for vCD that allows ConnectWise Integration and allow tenants to view and create new tickets directly from vCD

### Build ###
```bash
# install project dependencies
npm i

# build plugin
npm run build
```

At this point, there will be a `plugin.zip` in the `dist/` folder. 

#### Automated Deploy Method ####
A node script is included in the repo that will automatically deploy a plugin to vCD.  It will not publish to tenants as this must me done manually.  It requires a config.json file to be in the root directory and have the following format

```json
{
 "base_url": "vcd.cloud.example.com",
 "auth_token": "{Session Auth Token}"
}
```
Note: the auth token must be aquired by other means
