# vmshutdownpolicy - nodejs

This Azure Function is useful to enforce VM Shutdown Policies for cost saving purposes.

## How it works

Every 5 minutes this Azure Function will execute.
It will parse all Resource Groups in the local subscription and follow the following process for each Resource Group:

- find all Virtual Machines
- find all global DevTestLabs schedules
  - these are used to schedule VM shutdown
- identify the VMs that do not have a schedule applied
  - create a shutdown schedule
- identify the VMs that do have a schedule applied, but disabled
  - enable the shutdown schedule

## Shutdown schedule

The shutdown is scheduled for 8PM AEST daily. 30mins prior to shutdown a notification is sent to the email address defined in the `owner` tag on that VM.
If that tag doesn't exist, then a generic email address (IT Operations) will be used.