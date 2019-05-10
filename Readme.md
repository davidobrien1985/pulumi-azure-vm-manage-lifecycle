# Shut down Azure VMs on a schedule

This repo holds code that can be used to stand up an Azure Function leveraging the open source infrastructure as **real** code tool [Pulumi](https://github.com/pulumi). The Azure Function runs every 5 minutes and checks if there are any Azure VMs that do not have an Azure VM Auto Shutdown schedule attached to them.
These schedules are specifically important in test and development environments where cloud engineers / cloud administrators are allowed to create VMs manually and might forget to turn them off when they do not need them any more.

* Azure Function
  * `/functions`
    * Check [Readme](/functions/vmshutdownpolicy/readme.md) to understand how to use the function and what it does
* Infracode using Pulumi
  * `/infracode`

## Requirements

* `make`
* `zip`
* `az` cli (azure cli)
* `npm`
* `pulumi`

## Build and Deploy

Follow these steps to deploy this Azure Function:

* Build the Azure Function
  * `CURRENTDIR=${PWD}; cd functions; make; cd ${CURRENTDIR}`
  * this will build the NodeJS Azure Function and zip the whole Function app into the `/functions/build` directory
* Pulumi infra deployment
  * create a new pulumi stack
    * `pulumi stack init pulumi-azure-vm-shutdown`
  * update the values in `./infracode/Pulumi.<stackName>.yaml`
    * you can do it manually or use
      * `pulumi config set notificationGroup <emailAddress>`
      * `pulumi config set subscriptionId <subscriptionId>`
* Restore npm modules
  * `CURRENTDIR=${PWD}; cd infracode; npm install; cd ${CURRENTDIR}`
* Check what pulumi will do
  * `CURRENTDIR=${PWD}; cd infracode; pulumi preview; cd ${CURRENTDIR}`
* If all looks well, deploy the infrastructure
  * `CURRENTDIR=${PWD}; cd infracode; pulumi update; cd ${CURRENTDIR}`

## Next up

Future iterations of this Azure Function will see the following capabilities:

* Turn VMs on according to a specified schedule or VM tags
* Turn VMs off according to VM tags (without leveraging the VM shutdown schedule feature)

## Cost

I recommend doing your own cost calculation for this Azure Function. In my calculations on a consumption plan I don't get the Function to ever cost me anything, due to the free tier grant for Azure Functions, but YMMV.