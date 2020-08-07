'use strict';
const AWS = require('aws-sdk');
const Alexa = require("alexa-sdk");
const lambda = new AWS.Lambda();
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const uuid = require('uuid');
exports.handler = function(event, context, callback) {
const alexa = Alexa.handler(event, context);
alexa.appId = "amzn1.ask.skill.8d6356dd-57e2-4fe3-8aca-e090f97c3ae3";
alexa.registerHandlers(handlers);
alexa.execute();
};

var itemList = "";
const handlers = {
'LaunchRequest': function() {
this.emit(':ask', 'Hey there and Welcome to Lister. I can add missing items from your kitchen, or fill a reminder for your shopping later list. Let me know how I can help', 'Please say that again?');
},
'Unhandled': function() {
this.emit('AMAZON.HelpIntent');
},
'AddItems': function() {
var category = this.event.request.intent.slots.Category.value;
var timestamp = new Date().getTime();
var userId = this.event.context.System.user.userId;
if (typeof(category) != "undefined") {
console.log("\n\nLoading handler\n\n");
const dynamodbParams = {
TableName: process.env.DYNAMODB_TABLE_MYLIST,
Item: {
id: uuid.v4(),
userId: userId,
category: category,
createdAt: timestamp,
updatedAt: timestamp,
},
};
const params = {
TableName: process.env.DYNAMODB_TABLE_MYLIST,
FilterExpression: 'category = :this_category',
ExpressionAttributeValues: {
':this_category': category
}
};
dynamoDb.scan(params).promise()
.then(data => {
console.log('Got item: ' + JSON.stringify(data), params);
const self = this;
const item = data.Items[0];
if (!item) {
dynamoDb.put(dynamodbParams).promise()
.then(data => {
console.log('Item added: ', dynamodbParams);
this.emit(':ask', 'Added ' + category + '. You can add an item, delete item. You choose.');
})
.catch(err => {
console.error(err);
this.emit(':tell', 'Hey, hey, hey, we have a problem.');
});
} else {
this.emit(':ask', 'This ' + category + ' already exists');
}
})
}
},
'GetMyList': function() {
console.log("\n\nLoading handler\n\n");
console.log("Get My List start");

const params = {
TableName: process.env.DYNAMODB_TABLE_MYLIST
};
const self = this;

dynamoDb.scan(params, function(err, data) {
	if (err) {
		console.log("Db error start");

            this.emit(':tell', 'Test Error');
        } else {
var item = data.Items[0];
console.log("first item", item);

if (!item) {
self.emit(':ask', 'Sorry, We cant find that item. Try again with another item or add a new one.');
}
if (item) {
	console.log(item);

console.log("DEBUG:  Getitem worked. ");
var i;
itemList = [];
for (i = 0; i < data.Items.length; i++) {
	itemList += data.Items[i].category + "\n";
}

console.log("DEBUG:  Getitem worked. " + itemList);


self.emit(':ask', 'Items List: ' + 
	itemList + 
	'. Want to repeat the list?');
}
}
});
},
'DeleteItem': function() {
var category = this.event.request.intent.slots.Category.value;
const {
userId
} = this.event.session.user;
console.log(userId)
console.log(category)
if ((typeof(category) != "undefined")) {
console.log("\n\nLoading handler\n\n");
const params = {
TableName: process.env.DYNAMODB_TABLE_MYLIST,
FilterExpression: 'category = :this_category',
ExpressionAttributeValues: {
':this_category': category
}
};
console.log('Attempting to get item', params);
dynamoDb.scan(params).promise()
.then(data => {
console.log('Got item: ' + JSON.stringify(data), params);
const self = this;
const item = data.Items[0];
if (!item) {
self.emit(':ask', 'Sorry, We cant delete item because it does not exist. Try again with another item or add a new one.');
}
if (item) {
console.log('Attempting to delete data', data);
const newparams = {
TableName: process.env.DYNAMODB_TABLE_MYLIST,
Key: {
id: data.Items[0].id,
createdAt: data.Items[0].createdAt
}
};
console.log(newparams)
dynamoDb.delete(newparams, function(err, data) {
if (err) {
console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
self.emit(':tell', 'Oopsy daisy, beda gark, fitte muh, something went wrong.');
} else {
console.log("DEBUG:  deleteItem worked. ");
self.emit(':ask', 'So, i have deleted ' + category + ' from list. Wanna do anything else?');
}
});
}
})
}
},
'AMAZON.YesIntent': function() {
this.emit('Prompt');
},
'AMAZON.NoIntent': function() {
this.emit('AMAZON.StopIntent');
},
'AMAZON.RepeatIntent': function() {
this.emit(':ask', 'Please say the item name you want to add');
},
'AMAZON.StartOverIntent': function() {
this.response.shouldEndSession(false, "What item do you want to add today?");
},
'Prompt': function() {
this.emit('GetMyList');
},
'PromptGet': function() {
this.emit(':ask', 'Do you want to know your list of items?', 'Please say that again?');
},
'NoMatch': function() {
this.emit(':ask', 'Sorry, I couldn\'t understand.', 'Please say that again?');
},
'AMAZON.HelpIntent': function() {
const speechOutput = 'This skill helps you in adding missing items from your kitchen/ household or anything you want to note down.You can say add tea to add tea to your reminder list and know it is out of stock. which one would you like to do?';
const reprompt = 'Say hello, to hear me speak.';
this.response.speak(speechOutput).listen(reprompt);
this.emit(':responseReady');
},
'AMAZON.CancelIntent': function() {
this.response.speak('Goodbye!');
this.emit(':responseReady');
},
'AMAZON.StopIntent': function() {
this.response.speak('See you later!');
this.emit(':responseReady');
}
};