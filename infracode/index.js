"use strict";
const pulumi = require("@pulumi/pulumi");
const azure = require("@pulumi/azure");

var config = new pulumi.Config();
var notificationGroup = config.require('notificationGroup');
var subscriptionId = config.require('subscriptionId');

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup("resourceGroup", {
    location: "AustraliaSoutheast",
});

// Create an Azure Storage Account with random name
const storageAccount = new azure.storage.Account("storage", {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    accountTier: "Standard",
    accountReplicationType: "LRS",
});

const storageContainer = new azure.storage.Container("vmshutdownpolicystoragecontainer", {
    resourceGroupName: resourceGroup.name,
    storageAccountName: storageAccount.name,
    containerAccessType: "private",
    name: "functions"
});

const storageBlob = new azure.storage.Blob("vmshutdownpolicystorageblob", {
    resourceGroupName: resourceGroup.name,
    name: "functionapp.zip",
    storageAccountName: storageAccount.name,
    storageContainerName: storageContainer.name,
    type: "block",
    source: "../functions/build/functionapp.zip"
});

const token = storageAccount.primaryConnectionString.apply(primaryConnectionString => azure.storage.getAccountSAS({
    connectionString: primaryConnectionString,
    expiry: "2020-03-21",
    httpsOnly: true,
    permissions: {
        add: false,
        create: false,
        delete: false,
        list: false,
        process: false,
        read: true,
        update: false,
        write: false,
    },
    resourceTypes: {
        container: false,
        object: true,
        service: false,
    },
    services: {
        blob: true,
        file: false,
        queue: false,
        table: false,
    },
    start: "2019-05-01",
}));

const sasUrlQueryString = token.apply(test => token.sas);

const appServicePlan = new azure.appservice.Plan("vmshutdownpolicyasp", {
    name: "vmshutdownpolicyasp",
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    kind: "FunctionApp",
    sku: {
        tier: "Dynamic",
        size: "Y1"
    }
});

const functionApp = new azure.appservice.FunctionApp("vmshutdownpolicyfunctionapp", {
    name: "vmshutdownpolicyfunctionapp",
    location: resourceGroup.location,
    resourceGroupName: resourceGroup.name,
    appServicePlanId: appServicePlan.id,
    storageConnectionString: storageAccount.primaryConnectionString,
    version: "~2",
    identity: {
        type: "SystemAssigned"
    },
    appSettings: {
        WEBSITE_USE_ZIP: pulumi.concat("https://",storageAccount.name,".blob.core.windows.net/",storageContainer.name,"/",storageBlob.name,sasUrlQueryString),
        WEBSITE_NODE_DEFAULT_VERSION: "8.11.1",
        RESOURCEGROUP_NAME: resourceGroup.name,
        NOTIFICATION_GROUP: notificationGroup,
        SUBSCRIPTION_ID: subscriptionId
    }
});

// exports.FunctionUrl = functionApp.