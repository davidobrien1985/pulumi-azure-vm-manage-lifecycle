const msRestAzure = require('ms-rest-azure');
const msComputeClient = require('azure-arm-compute');
const msDevTestLabsClient = require('azure-arm-devtestlabs');
const msResourcesClient = require('azure-arm-resource');

let clientId = process.env['CLIENT_ID']; // service principal
let domain = process.env['DOMAIN']; // tenant id
let secret = process.env['APPLICATION_SECRET']; // service principal secret
let subscriptionId = process.env['APPSETTING_SUBSCRIPTION_ID']; // azure subscription id
let msiendpoint = process.env["MSI_ENDPOINT"];
let msisecret = process.env['MSI_SECRET'];
let notificationGroup = process.env['NOTIFICATION_GROUP'];


async function getAzureCredentials(context) {
  if (msiendpoint) {
    context.log("Acquiring MSI credentials.");
    return msRestAzure.loginWithAppServiceMSI();
  } else {
    context.log("Acquiring credentials from SPN.");
    return msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain);
  }
}

async function getAzureVms(context, vmClient, resourceGroupName) {
  context.log("Finding all the VMs...");
  return vmClient.virtualMachines.list(resourceGroupName);
}

async function getAzureDtlSchedules(context, dtlClient, resourceGroupName) {
  context.log("Finding all the global schedules...");
  return dtlClient.globalSchedules.listByResourceGroup(resourceGroupName);
}

async function enableAzureDtlSchedule(context, dtlClient, schedule, resourceGroupName) {
  context.log("Enabling schedule " + schedule.name);
  schedule.status = 'Enabled';
  context.log(schedule);
  try {
    return dtlClient.globalSchedules.createOrUpdate(resourceGroupName, schedule.name, schedule);
  } catch (error) {
    context.log(error)
  }
}

async function createAzureDtlSchedule(context, dtlClient, vm, resourceGroupName) {
  try {
    var owner = vm.tags['owner'];
  } catch (error) {
    context.log("No owner defined, use generic group.");
    var owner = notificationGroup;
  }
  const newSchedule = {
    "status": "Enabled",
    "taskType": "ComputeVmShutdownTask",
    "location": vm.location,
    "dailyRecurrence": {
      "time": "2000"
    },
    "timeZoneId": "AUS Eastern Standard Time",
    "notificationSettings": {
      "status": "Enabled",
      "timeInMinutes": 30,
      "webhookUrl": "",
      "emailRecipient": owner
    },
    "targetResourceId": vm.id
  }
  context.log("Creating a shutdown schedule for VM " + vm.name);
  try {
    return dtlClient.globalSchedules.createOrUpdate(resourceGroupName, "shutdown-computevm-" + vm.name, newSchedule);
  } catch (error) {
    context.log(error);
  }
}

async function getAzureResourceGroups(context, resourcesClient) {
  context.log("Retrieving all Resource Groups in this subscription...");
  return resourcesClient.resourceGroups.list();
}

function isEmpty(obj) {
  return !obj || Object.keys(obj).length === 0;
}

module.exports = async function (context, myTimer) {

  credentials = await getAzureCredentials(context, clientId, secret, domain);
  const vmClient = new msComputeClient(credentials, subscriptionId);
  const dtlClient = new msDevTestLabsClient(credentials, subscriptionId);
  const resourcesClient = new msResourcesClient.ResourceManagementClient(credentials, subscriptionId);

  var resourceGroups = await getAzureResourceGroups(context, resourcesClient);

  for (resourceGroup of resourceGroups) {
    context.log("Found Resource Group " + resourceGroup.name);

    var vms = await getAzureVms(context, vmClient, resourceGroup.name);
    var schedules = await getAzureDtlSchedules(context, dtlClient, resourceGroup.name);

    for (vm of vms) {
      context.log("Testing for schedule for " + vm.id);
      scheduleName = "shutdown-computevm-" + vm.name;

      if (schedules.every(({ name }) => name !== scheduleName)) {
        context.log(vm.name + " has no schedule assigned, let's create one...");
        result = await createAzureDtlSchedule(context, dtlClient, vm, resourceGroup.name);
        context.log(result);
      } else {
        context.log("found a schedule for " + vm.name);
        for (schedule of schedules) {
          context.log(schedule.name);
          if (schedule.name == "shutdown-computevm-" + vm.name) {
            context.log("Found schedule " + schedule.name + " with status " + schedule.status);
            if (schedule.status == "Disabled") {
              result = await enableAzureDtlSchedule(context, dtlClient, schedule, resourceGroup.name);
              context.log(result);
            } else {
              context.log(vm.name + " already has an enabled shutdown schedule assigned. Nothing to do here...");
            }
          };
        };
      };
      if (isEmpty(schedules)) {
        context.log("Clean slate, no schedules found at all...");
        context.log(vm.name + " has no schedule assigned, let's create one...");
        result = await createAzureDtlSchedule(context, dtlClient, vm, resourceGroup.name);
        context.log(result);
      }
    };
  };
};