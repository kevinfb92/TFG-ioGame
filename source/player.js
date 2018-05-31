var tileSize = 16;

class Player{
	constructor(game, client, isSelf){
		this.socket = client;
		this.game = game;
		this.host = false;
		this.server = false;
		this.id = "";
		this.sprite = {};	//clientside only
		this.serverSprite = {};		//debug server sprite position
		this.inputs = [];	//serverside
		this.pendingInputs = [];	//inputs for when we reconciliate with server, clientside only
		this.pendingIterationDeltaTimes = [];	//for reconciliation. Since we don't store inputs that don't change the destination tile, we need to store the deltaTimes of every iteration here
		this.pidtCounters = [];
		this.lastProcessedInput = -1;				//for reconc., index of last processed input
		this.positionBuffer = [];	//clientside, save previous positions here for interpolation
		this.lastInputSequenceNumber = 0;
		this.isSelf = isSelf;
		this.state = 'not connected';
		this.test = 0;

		if(this.socket){
//			console.log("Player created in server");
			this.id = client.userid;
			this.lastInputSequenceNumber = -1;
			this.server = true;
		}else{
//			console.log("Player created");
		}
		
		this.pos = {
			x: 0,
			y: 0
		};
		
//		console.log("Position: "+this.pos.x+", "+this.pos.y);

		this.destination = {	//the tile we're moving to, if we moving
			x: 0,
			y: 0
		};

		this.size = {
			x: tileSize,
			y: tileSize
		};

		this.moving = false;	//if traveling to the destination tile
		this.reached = true;
		this.hitting = false;	//if drill animation on
		this.hitAnimationDuration = 0.2;
		this.hitAnimationCounter = 0;
		this.speed = 5;			//how much time it takes to move from tile to tile
		this.damage = 1;
	}

	ServerStoreInput(data){
		var data = JSON.parse(data);
		var input = {};
		input.timeStamp = data.timeStamp.replace(",",".");
//		console.log(input.timeStamp);
		input.key = data.key;
		input.sequenceNumber = data.sequenceNumber;
		this.inputs.push(input);
	}

	//process messages from server reggarding our position. do server reconciliation
	ClientServerReconciliation(netUpdate){
		//test on net
	
		var latestUpdate = netUpdate;
		var serverDestination = latestUpdate[this.id].destination;
		var myServerPos = latestUpdate[this.id].pos;
		var serverSequence = latestUpdate[this.id].inputSequence;

		var i = 0;

		var pdinputs = this.pendingInputs;
//		console.log(pdinputs);

		if(!this.moving)
			while(i < this.pendingInputs.length){
				if(this.pendingInputs[i].sequenceNumber >= serverSequence){
//					console.log(i+" serverSequence: "+serverSequence+", input sequence: "+this.pendingInputs[i].sequenceNumber);

					var input = this.pendingInputs[i];
					var index = input.sequenceNumber+1;
//					console.log(index);
					
					var inputPos = input.pos;
					var inputDestination = input.destination;

//					console.log("Server destination: "+serverDestination.x+", "+serverDestination.y);
//					console.log("Input position: "+inputPos.x+", "+inputPos.y);
//					console.log("Input destination: "+inputPos.x+", "+inputPos.y);
					
					if(inputPos.x == serverDestination.x && inputPos.y == serverDestination.y){

					}
					else if(inputDestination.x == serverDestination.x && inputDestination.y == serverDestination.y){

					}
					else{
						this.pos = myServerPos;
						this.moving = latestUpdate[this.id].moving;
						this.destination = serverDestination;
						this.hitting = latestUpdate[this.id].hitting;

//						console.log("FIXING POSITION");
					}

//					console.log(i+" inputSequence: "+index);
	/*					if(this.pendingIterationDeltaTimes[index]){
							console.log("exists");
							var auxMoving = this.moving;
							var auxDestination = this.destination;


//							var auxPos = {};
//							auxPos.x = this.pos.x;	//to check if positions match after the reconciliation
//							auxPos.y = this.pos.y

//							this.pos = myServerPos;
//							console.log("this pos: "+this.pos.x+", "+this.pos.y);
//							this.moving = latestUpdate[this.id].moving;
//							this.destination = latestUpdate[this.id].destination;
/*
							this.ApplyInput(input);
						//get delta time
							console.log("length: "+this.pidtCounters[index]);
							for(var j = 0; j < this.pendingIterationDeltaTimes[index].length; j++){
								var deltaTime = this.pendingIterationDeltaTimes[index][j];
								console.log("moving: "+this.moving+", "+deltaTime);
								this.UpdatePhysics(deltaTime, true);
							}
							
//							console.log("Client position: "+auxPos.x+", "+auxPos.y);
//							console.log("Reconc position: "+this.pos.x+", "+this.pos.y);
//							this.moving = auxMoving;
//							this.destination = auxDestination;
						}*/
					i++;
				}
				else{
					this.pendingInputs.splice(i, 1);
				}
			}
		
	}

	ClientProcessInputs(socket, time){	//we check the current inputs to store them for later reconciliation and send them to the server right now
		//if we have cliendside prediction enabled we'll apply the input as we check the inputs right here
		var now = new Date().getTime()/1000.0;
		var deltaTime = now - this.lastUpdateTime || now; //if lastupdatetime doesn't exist yet just use the current date
		this.lastUpdateTime = now;

		var input = {};
		input.key = "n";

//		game.debug.text(this.pos.x.toFixed(1)+", " +this.pos.y.toFixed(1), spritePos.x, spritePos.y);

		var spritePos = this.sprite.worldPosition;			
		var spriteWorldPos = this.sprite.position;
//		game.debug.text(spriteWorldPos.x+", " +spriteWorldPos.y, spritePos.x, spritePos.y);

		if(game.input.activePointer.isDown){
			var angle = GetAngle(spritePos, game.input.activePointer.position);
//			game.debug.geom(point, 'rgba(255,255,0,1)');
//			game.debug.text(game.input.activePointer.x+", " +game.input.activePointer.y, point.x, point.y);
//			game.debug.text("Angle: "+angle, game.input.activePointer.x, game.input.activePointer.y);

			if(angle >= -45 && angle <= 45){
				input.key = "r";
			}
			else if(angle >=-135  && angle <= -45){
				input.key = "u";
			}
			else if(angle >=45 && angle <=135){
				input.key = "d"
			}	
			else{
				input.key = "l";
			}
//		console.log("calling  process inputs");
		}

		else{
			if(upKey.isDown){
				input.key = 'u';
			}
			else if(rightKey.isDown){
				input.key = 'r';
			}
			else if(downKey.isDown){
				input.key = 'd';
			}
			else if(leftKey.isDown){
				input.key = 'l';
			}			
		}


		var newDestination = this.ApplyInput(input);

		if(newDestination || newDestination == 'hit'){
			input.sequenceNumber = this.lastInputSequenceNumber;
//			console.log(input.sequenceNumber+": "+newDestination+", "+this.pos.x+", "+this.pos.y);
			this.lastInputSequenceNumber++;

			input.id = this.id;
			input.timeStamp = time.toString().replace(".", ",");
			input.pos = this.pos;
			input.destination = this.destination;

			var serialized = JSON.stringify(input);
			serialized = "i."+serialized;
			this.game.socket.send(serialized);
			this.pendingInputs.push(input);
		}
	}

	ServerProcessInputs(){
		var input = {};
		input.key = "n";

		var now = new Date().getTime()/1000.0;
		var deltaTime = now - this.lastUpdateTime || now; //if lastupdatetime doesn't exist yet just use the current date
		this.lastUpdateTime = now;	

		var numberOfInputs = this.inputs.length;

		this.reached = false;
		if(numberOfInputs){
			for(var i = 0; i < numberOfInputs; i++){
				if(this.inputs[i].sequenceNumber > this.lastInputSequenceNumber){
					input.key = this.inputs[i].key;
					var newDestination = this.ApplyInput(input);

			//		console.log(this.inputs[i].sequenceNumber+": "+newDestination+", "+this.pos.x+", "+this.pos.y);
					if(newDestination == "hit"){
			//			console.log(newDestination);
						this.lastInputSequenceNumber = this.inputs[i].sequenceNumber;
						this.inputs.splice(0, i+1);	
					}
					else if(newDestination){
						this.lastInputSequenceNumber = this.inputs[i].sequenceNumber;
						this.inputs.splice(0, i+1);						
					}
					else{

					}
					break;
				}
			}
		}

		if(this.pos.x == this.destination.x && this.pos.y == this.destination.y){

			this.reached = true;
		}
	}


	ApplyInput(input){
		var newDestination = false;
		if(this.moving && !this.hitting){
			if(this.pos.x == this.destination.x && this.pos.y == this.destination.y){	//if we already reached 
				this.reached = true;
				this.moving = false;	//then don't move at all this frame and mark as not moving
				if(input.key !== "n"){	//check for input the same frame so that we don't stop
					var destination = this.GetDestination(input.key, this.game.map);
					if(destination.state != 'hit'){
						this.destination = destination;
						this.moving = true;
						newDestination = true;
						this.reached = false;
					}
					else{
//						console.log("tile "+destination.x+", " +destination.y);
						this.HitTile(destination);
						newDestination = 'hit';
						this.hitting = true;
					}
				}
			}
			else{	//we not there
				this.reached = false;
			}
		}
		else if(!this.hitting){
			if(input.key !== "n"){	//if we're not moving check for input that tells us to move
				var destination = this.GetDestination(input.key, this.game.map);
				if(destination.state != 'hit'){
					this.destination = destination;
					this.moving = true;
					newDestination = true;
				}
				else{
			//		console.log("tile "+destination.x+", " +destination.y);
					this.HitTile(destination);
					newDestination = 'hit';
					this.hitting = true;
				}
			}
		}
		return(newDestination);
	}


	UpdatePhysics(deltaTime, reconciliation){

//		console.log("moving: "+this.moving);
		if(this.moving){
			this.MoveToTile(this.destination, deltaTime);
			//store the deltaTimes for server reconciliation
			if(this.server){
//				console.log("Physics update: "+this.pos.x+", "+this.pos.y);
			}
			if(reconciliation){
			}
			else if(!this.server){
				if(!this.pendingIterationDeltaTimes[this.lastInputSequenceNumber]){
					this.pendingIterationDeltaTimes[this.lastInputSequenceNumber] = [];
					this.pidtCounters[this.lastInputSequenceNumber] = 0;
			//			console.log("Saving dt iterations for input "+this.lastInputSequenceNumber);
						var newArray = this.pendingIterationDeltaTimes.slice();
			//			console.log(newArray);
				}
				this.pendingIterationDeltaTimes[this.lastInputSequenceNumber].push(deltaTime);
				this.pidtCounters[this.lastInputSequenceNumber]++;
			//	console.log("length: "+this.pidtCounters[this.lastInputSequenceNumber]);
				if(this.pendingIterationDeltaTimes.length >= 10){
					this.pendingIterationDeltaTimes.splice(0, 1);
					this.pidtCounters.splice(0,1);
				}

			//	console.log(this.pos.x+", "+this.pos.y);
			}
		}
		else if(this.hitting){
			if(this.hitAnimationCounter < this.hitAnimationDuration){
				this.hitAnimationCounter += deltaTime;
				//do stuff
//				console.log("hitting");
			}
			else{
				this.hitAnimationCounter = 0;
				this.hitting = false;
			}
		}
	}

	GetDestination(key, map){
		var tile = {};
		tile.x = Math.trunc(this.pos.x);
		tile.y = Math.trunc(this.pos.y);
		tile.state = "moved";
		switch(key){
			case "u":
				tile.y = tile.y - 1;
				break;
			case "d":
				tile.y = tile.y + 1;
				break;
			case "r":
				tile.x = tile.x + 1;
				break;
			case "l":
				tile.x = tile.x - 1;
				break;
		}

		if(!map.IsTileFree(tile.x, tile.y)){
			tile.state = "hit";
	//		console.log("tile "+tile.x+", " +tile.y);
		}
		return(tile);
	}

	HitTile(tilePos){
		this.game.map.HitTile(tilePos.x, tilePos.y, this.damage);
	}

	MoveToTile(tilePos, deltaTime){	//moves to adjacent tile
//		console.log("Destinat: "+this.destination.x+", "+this.destination.y);
//		console.log("Position: "+this.pos.x+", "+this.pos.y);

		var direction = {};
		direction.x = tilePos.x - this.pos.x;
		direction.y = tilePos.y - this.pos.y;

		if(direction.x > 0){
			direction.x = 1;
		}
		else if(direction.x < 0){
			direction.x = -1;
		}
		else{
			direction.x = 0;
		}
		if(direction.y > 0){
			direction.y = 1;
		}
		else if(direction.y < 0){
			direction.y = -1;
		}
		else{
			direction.y = 0;
		}

		var simulatedPos = this.pos;
		if(direction.x != 0)
			simulatedPos.x = this.pos.x + direction.x*this.speed*deltaTime;

		if(direction.y != 0)
			simulatedPos.y = this.pos.y + direction.y*this.speed*deltaTime;		

//		console.log("sim position: "+simulatedPos.x+", "+simulatedPos.y);

		//check if we reached the destination
		var reached = false;

		if(direction.x > 0){	//going right
			if(Math.abs(simulatedPos.x) >= Math.abs(tilePos.x)){
				reached = true;
			}
		}
		else if(direction.x < 0){	//going left
			if(Math.abs(simulatedPos.x) <= Math.abs(tilePos.x)){
				reached = true;
			}
		}
		else if(direction.y > 0){	//goin up
			if(Math.abs(simulatedPos.y) >= Math.abs(tilePos.y)){
				reached = true;
			}
		}
		else if(direction.y < 0){	//going down
			if(Math.abs(simulatedPos.y) <= Math.abs(tilePos.y)){
				reached = true;
			}
		}
		if(!reached){
			this.pos.x = simulatedPos.x;
			this.pos.y = simulatedPos.y;
		}else{
	//		console.log("reached objective");
			this.pos.x = tilePos.x;
			this.pos.y = tilePos.y;
		}
//		console.log("Delta time: "+deltaTime);
//		console.log("Position: "+this.pos.x+", "+this.pos.y);
		if(!this.server){
			this.SetPosition(this.pos);
		}
	}

	SetPosition(pos){
		this.pos.x = pos.x;
		this.pos.y = pos.y;	
		SetSpritePosition(this.sprite, pos);	//method on rendering
		if(this.isSelf){
		//	SetCameraPosition(GetSpritePosition(this.sprite));
		}
		
	}

	SetServerPosition(pos){
		SetSpritePosition(this.serverSprite, pos);	//method on rendering		
	}

	CreateSprite(){
		var cords = this.pos;
		if(this.isSelf){
			this.serverSprite = AddSprite('blue', cords);
//		console.log("New Sprite");
			this.sprite = AddSprite('red', cords);
//			this.sprite.visible = false;
//			SetCameraTarget(this.sprite);
		}
		else{
			this.sprite = AddSprite('blue', cords);
		}
	}

	RemoveSprite(){
		DeleteSprite(this.sprite);
	}
}


if(typeof(global) !== 'undefined'){	//if global doesn't exist (it's "window" equivalent for node) then we're on browser
	module.exports = Player;
}