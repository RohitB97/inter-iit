var express = require("express");
var app = express();
var path = require("path");
var apimedic = require('./apimedic');
app.use(express.static(path.resolve(__dirname,"../client")));

var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/',function(req,res){
	res.sendFile(path.resolve(__dirname,"../client/index.html"));
});

io.on('connection', function(socket){
	var state = 'FREE'; // FREE -> EXTRA_SYMPT -> DIAGNOSED = FREE
	var full_symptoms_list = [];
	var suggestions_list = [];

	io.emit('chat_response', "What are your symptoms?");
	socket.on('chat_message', function(msg){
		if(state == 'FREE'){
			// get initial symptoms list
			// TODO age, ..
			var symptoms_list = apimedic.parse_symptoms(msg);
			// io.emit('chat_response', "Got symptoms " + String(symptoms_list));
			full_symptoms_list = symptoms_list.slice();

			// give user suggestions
			apimedic.get_suggestions(full_symptoms_list, function(data){
				
				console.log(full_symptoms_list, data)
				if(data.length == 0){
					apimedic.get_diagnosis(full_symptoms_list, function(data){
						if(data.length == 0){
							io.emit('chat_response', 'No diagnosis available.')
						} else {
							var response = "Your diagnosis is:</br>";
							console.log(data)
							data.forEach(function(value, index){
								response = response + String(index+1) + ') ' + value.Issue.Name + '</br>' 
								response = response + 'See a ' + value.Specialisation[0].Name + ' specialist</br>';
							})
							io.emit('chat_response', response)
							state = 'FREE';
							full_symptoms_list = [];
							suggestions_list = [];
						}
					})
				} else {
					suggestions_list = data.map(value => value.Name);
					var response = "Do you have these other symptoms:</br>";
					data.forEach(function(value, index){
						response = response + String(index+1) + ') ' + value.Name + '</br>';
					})
					response = response + String(data.length+1) + ') None ';
					io.emit('chat_response', response)
					state = 'EXTRA_SYMPT';
				}
			})
		} else if(state == 'EXTRA_SYMPT'){
			var symptoms_list = apimedic.parse_list(msg);
			console.log(full_symptoms_list, symptoms_list)
			if(full_symptoms_list.length > 5 || (symptoms_list.length == 1 && parseInt(symptoms_list[0]) == (suggestions_list.length + 1))){
				// None
				apimedic.get_diagnosis(full_symptoms_list, function(data){
					console.log(full_symptoms_list, data)
					if(data.length == 0){
						io.emit('chat_response', 'No diagnosis available.')
					} else {
						var response = "Your diagnosis is:</br>";
						console.log(data)
						data.forEach(function(value, index){
							response = response + String(index+1) + ') ' + value.Issue.Name + '</br>' 
							response = response + 'See a ' + value.Specialisation[0].Name + ' specialist</br>';
						})
						io.emit('chat_response', response)
						state = 'FREE';
						full_symptoms_list = [];
						suggestions_list = [];
					}
				})
			} else {
				var symptoms_name_list = []
				symptoms_list.forEach(idx => {
					idx = parseInt(idx) - 1;
					if(idx < suggestions_list.length)
						symptoms_name_list.push(suggestions_list[idx])
				})
				console.log(symptoms_name_list)
				symptoms_name_list.forEach(value => full_symptoms_list.push(value))
				// io.emit('chat_response', "Added symptoms : " + JSON.stringify(symptoms_name_list))
				apimedic.get_suggestions(full_symptoms_list, function(data){
					console.log(data);
					if(data.length == 0){
						apimedic.get_diagnosis(full_symptoms_list, function(data){
							if(data.length == 0){
								io.emit('chat_response', 'No diagnosis available.')
							} else {
								var response = "Your diagnosis is:</br>";
								console.log(data)
								data.forEach(function(value, index){
									response = response + String(index+1) + ') ' + value.Issue.Name + '</br>' 
									response = response + 'See a ' + value.Specialisation[0].Name + ' specialist</br>';
								})
								io.emit('chat_response', response)
								state = 'FREE';
								full_symptoms_list = [];
								suggestions_list = [];
							}
						})
					} else {
						suggestions_list = data.map(value => value.Name);
						var response = "Do you have these other symptoms:</br>";
						data.forEach(function(value, index){
							response = response + String(index+1) + ') ' + value.Name + '</br>';
						})
						response = response + String(data.length+1) + ') None ';
						io.emit('chat_response', response)
						state = 'EXTRA_SYMPT';
					}
				})
			}
		}
		
	});
});

//create APIs

http.listen(3000);
console.log("Server listening on port 3000");