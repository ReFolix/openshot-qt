//variables for panning by middle click
var is_scrolling = false;
var starting_scrollbar = { x: 0, y: 0 };
var starting_mouse_position = { x: 0, y: 0 };

//variables for scrolling control
var scroll_left_pixels = 0;



//This container allows for tracks to be scrolled (with synced ruler)
//and allows for panning of the timeline with the middle mouse button
App.directive('tlScrollableTracks', function () {
	return {
		restrict: 'A',
		
		link: function (scope, element, attrs) {
			
			//sync ruler to track scrolling
			element.on('scroll', function () {
				//set amount scrolled
				scroll_left_pixels = element.scrollLeft();

				$('#track_controls').scrollTop(element.scrollTop());
				$('#scrolling_ruler').scrollLeft(element.scrollLeft());
				$('#progress_container').scrollLeft(element.scrollLeft());
			});

			//handle panning when middle mouse is clicked
			element.on('mousedown', function(e) {
				if (e.which == 2) { // middle button
					e.preventDefault();
					is_scrolling = true;
					starting_scrollbar = { x: element.scrollLeft(), y: element.scrollTop() };
					starting_mouse_position = { x: e.pageX, y: e.pageY };
				}
				return true;
			});

			//pans the timeline on move
			element.on('mousemove', function(e){
				if (is_scrolling) {
					// Calculate difference from last position
					difference = { x: starting_mouse_position.x-e.pageX, y: starting_mouse_position.y-e.pageY};

					// Scroll the tracks div
					element.scrollLeft(starting_scrollbar.x + difference.x);
					element.scrollTop(starting_scrollbar.y + difference.y);
				}
				return true;
			});
			

		}
	};
});

//the body of the app. allows for capture of released middle mouse button
App.directive('tlBody', function () {
	return {
		link: function (scope, element, attrs){

			element.on('mouseup', function(e){
				if (e.which == 2) // middle button
					is_scrolling = false;
				return true;
			});


		}
	};
});


//The HTML5 canvas ruler
App.directive('tlRuler', function ($timeout) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			//on click of the ruler canvas, jump playhead to the clicked spot
			element.on('mousedown', function(e){
				// Get playhead position
				var playhead_left = e.pageX - element.offset().left;
				var playhead_seconds = playhead_left / scope.pixelsPerSecond;
				
				// Animate to new position (and then update scope)
				scope.playhead_animating = true;
				$(".playhead-line").animate({left: playhead_left + scope.playheadOffset }, 200);
				$(".playhead-top").animate({left: playhead_left + scope.playheadOffset }, 200, function() {
					// Animation complete.
					scope.$apply(function(){
						scope.project.playhead_position = playhead_seconds;
						scope.playheadTime = secondsToTime(playhead_seconds);
						scope.playhead_animating = false;
					});
				});

			});
			
			// Move playhead to new position (if it's not currently being animated)
			element.on('mousemove', function(e){
				if (e.which == 1 && !scope.playhead_animating) { // left button
					var playhead_seconds = (e.pageX - element.offset().left) / scope.pixelsPerSecond;
					scope.$apply(function(){
						scope.project.playhead_position = playhead_seconds;
						scope.playheadTime = secondsToTime(playhead_seconds);
					});
				}
			});

			//watch the scale value so it will be able to draw the ruler after changes,
			//otherwise the canvas is just reset to blank
			scope.$watch('project.scale + markers', function (val) {
             if (val){
             	
	            	 $timeout(function(){
						//get all scope variables we need for the ruler
						var scale = scope.project.scale;
						var tick_pixels = scope.project.tick_pixels;
						var each_tick = tick_pixels / 2;
						var pixel_length = scope.project.duration * scope.pixelsPerSecond;

				    	//draw the ruler
				    	var ctx = element[0].getContext('2d');
				    	//clear the canvas first
				    	ctx.clearRect(0, 0, element.width, element.height);
				    	//set number of ticks based 2 for each pixel_length
				    	num_ticks = pixel_length / 50;

						ctx.lineWidth = 1;
						ctx.strokeStyle = "#c8c8c8";
						ctx.lineCap = "round";
				    	
				    	//loop em and draw em
						for (x=0;x<num_ticks+1;x++){
							ctx.beginPath();

							//if it's even, make the line longer
							if (x%2 == 0){ 
								line_top = 18;
								//if it's not the first line, set the time text
								if (x != 0){
									//get time for this tick
									time = (scale * x) /2;
									time_text = secondsToTime(time);

									//write time on the canvas, centered above long tick
									ctx.fillStyle = "#c8c8c8";
									ctx.font = "0.9em Sans";
									ctx.fillText(time_text, x*each_tick-22, 11);	
								}
							} else { 
								//shorter line
								line_top = 28;
							}
							
							ctx.moveTo(x*each_tick, 39);
							ctx.lineTo(x*each_tick, line_top);
							ctx.stroke();
						}

						//marker images
						$.each(scope.project.markers, function() {
							
							var img = new Image();
							img.src = "media/images/markers/"+this.icon;
							var img_loc = this.location * scope.pixelsPerSecond;
							img.onload = function() {
								ctx.drawImage(img, img_loc-img.width/2, 25);
							};
							
						});

						//redraw audio if needed
						$.each(scope.project.clips, function(){
							drawAudio(scope, this.id);
							handleVisibleClipElements(scope, this.id);
						});
						
						
						
				    }, 0);   

             }
         });

		}

	};
});


//The HTML5 canvas ruler
App.directive('tlRulertime', function ($timeout) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			//on click of the ruler canvas, jump playhead to the clicked spot
			element.on('mousedown', function(e){
				var playhead_seconds = 0.0;
				scope.$apply(function(){
					scope.project.playhead_position = playhead_seconds;
					scope.playheadTime = secondsToTime(playhead_seconds);
				});

			});
			
			// Move playhead to new position (if it's not currently being animated)
			element.on('mousemove', function(e){
				if (e.which == 1 && !scope.playhead_animating) { // left button
					var playhead_seconds = 0.0;
					scope.$apply(function(){
						scope.project.playhead_position = playhead_seconds;
						scope.playheadTime = secondsToTime(playhead_seconds);
					});
				}
			});
			
			
		}
	};
});
		


//Handles the HTML5 canvas progress bar
App.directive('tlProgress', function($timeout){
	return {
		link: function(scope, element, attrs){
			scope.$watch('progress + project.scale', function (val) {
             if (val) {
             	$timeout(function(){
				        var progress = scope.project.progress;
						for(p=0;p<progress.length;p++){
							
							//get the progress item details
							var start_second = progress[p][0];
							var stop_second = progress[p][1];
							var status = progress[p][2];
							
							//figure out the actual pixel position
							var start_pixel = start_second * scope.pixelsPerSecond;
							var stop_pixel = stop_second * scope.pixelsPerSecond;
							var rect_length = stop_pixel - start_pixel;
							
							//get the element and draw the rects
							var ctx = element[0].getContext('2d');
							ctx.beginPath();
						    ctx.rect(start_pixel, 0, rect_length, 5);
						   	//change style based on status
						   	if (status == 'complete'){
								ctx.fillStyle = 'green';
							}else{
								ctx.fillStyle = 'yellow';
							}
						   	ctx.fill();
						}
             	}, 0);
             		
             }
         });

			
		}
	};
});




