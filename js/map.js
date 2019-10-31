$(function(){
	
	var worldMap;
	var mouse = { x: 0, y: 0 }

	
	function Map() {
		
		this.WIDTH       = window.innerWidth; 
		this.HEIGHT      = window.innerHeight;  
		
		this.VIEW_ANGLE  = 45;
		this.NEAR        = 0.1; 
		this.FAR         = 10000;
		this.CAMERA_X    = 0;
		this.CAMERA_Y    = 1000;
		this.CAMERA_Z    = 500;
		this.CAMERA_LX   = 0;
		this.CAMERA_LY   = 0;
		this.CAMERA_LZ   = 0;
		
		this.geo;
		this.scene = {};
		this.renderer = {};
		this.projector = {};
		this.camera = {};
		this.stage = {};
		
		this.INTERSECTED = null;

		this.speed = .007;
	}
	
	Map.prototype = {
		
		init_d3: function() {

			geoConfig = function() {
				
				this.mercator = d3.geo.equirectangular();
				this.path = d3.geo.path().projection(this.mercator);
				
				var translate = this.mercator.translate();
				translate[0] = 500;
				translate[1] = 0;
				
				this.mercator.translate(translate);
				this.mercator.scale(200);
			}
	
			this.geo = new geoConfig();
		},
		
		init_tree: function() {
			
			if( Detector.webgl ){
				this.renderer = new THREE.WebGLRenderer({
					antialias : true
				});
				this.renderer.setClearColor( 0xBBBBBB, 1 );
			} else {
				this.renderer = new THREE.CanvasRenderer();
			}
			
			this.renderer.setSize( this.WIDTH, this.HEIGHT );
			
			// this.projector = new THREE.Projector();
			
			// append renderer to dom element
			$("#worldmap").append(this.renderer.domElement);
			
			// create a scene
			this.scene = new THREE.Scene();
			
			// put a camera in the scene
			this.camera = new THREE.PerspectiveCamera(this.VIEW_ANGLE, this.WIDTH / this.HEIGHT, this.NEAR, this.FAR);
			this.camera.position.x = this.CAMERA_X;
			this.camera.position.y = this.CAMERA_Y;
			this.camera.position.z = this.CAMERA_Z;
			this.camera.lookAt( { x: this.CAMERA_LX, y: 0, z: this.CAMERA_LZ} );
			this.scene.add(this.camera);


		    this.orbitControls = new THREE.OrbitControls(this.camera);
		    // this.orbitControls.autoRotate = true;
		    this.clock = new THREE.Clock();
		},
		
		
		add_light: function(x, y, z, intensity, color) {
			var pointLight = new THREE.PointLight(color);
			pointLight.position.x = x;
			pointLight.position.y = y;
			pointLight.position.z = z;
			pointLight.intensity = intensity;
			this.scene.add(pointLight);
		},
		
		add_plain: function(x, y, z, color) {
			var planeGeo = new THREE.BoxGeometry(x, y, z);
			var planeMat = new THREE.MeshLambertMaterial({color: color});
			var plane = new THREE.Mesh(planeGeo, planeMat);
			
			// rotate it to correct position
			plane.rotation.x = -Math.PI/2;
			this.scene.add(plane);
		},
		
		transElement: function(el) {
			// rotate and position the elements
			el.rotation.x = Math.PI/2;
			el.translateX(-490);
			el.translateZ(50);
			el.translateY(20);
		},
		
		add_countries: function(data) {

				var countries = [];
				var i, j;
				
				// convert to threejs meshes
				for (i = 0 ; i < data.features.length ; i++) {
					var geoFeature = data.features[i];
					var properties = geoFeature.properties;
					var feature = this.geo.path(geoFeature);
					
					// we only need to convert it to a three.js path
					var mesh = transformSVGPathExposed(feature);
					
					// add to array
					for (j = 0 ; j < mesh.length ; j++) {
						  countries.push({"data": properties, "mesh": mesh[j]});
					}
				}
				// extrude paths and add color
				for (i = 0 ; i < countries.length ; i++) {
		
					// create material color based on average		
					var material = new THREE.MeshPhongMaterial({
						color: this.getCountryColor(countries[i].data), 
						transparent: true,	
						opacity:0.5
					}); 
							
					// // extrude mesh
					// var shape3d = countries[i].mesh.extrude({
					// 	amount: 1, 
					// 	bevelEnabled: false
					// });

					var shape3d = new THREE.ExtrudeGeometry(countries[i].mesh, {
						amount: 1, 
						// depth: 1, 
						bevelEnabled: false
					});

					// create a mesh based on material and extruded shape
					var toAdd = new THREE.Mesh(shape3d, material);
					
					//set name of mesh
					toAdd.name = countries[i].data.name;

					// if (!latlngHash[toAdd.name]) {
					// 	console.log(toAdd.name);
					// }
					
					this.transElement(toAdd);

					// add to scene
					this.scene.add(toAdd);

					// wireframe
					// var geo = new THREE.EdgesGeometry( toAdd.geometry ); // or WireframeGeometry
					// var mat = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
					// var wireframe = new THREE.LineSegments( geo, mat );
					// toAdd.add( wireframe );
				}
		},
		
		getCountryColor: function(data) {
			if (data.name === 'China') {return 0xffff00;}
			return 0x008fff;
		},
		
		setCameraPosition: function(x, y, z, lx, lz) {	
			this.CAMERA_X = x;
			this.CAMERA_Y = y;
			this.CAMERA_Z = z;
			this.CAMERA_LX = lx;
			this.CAMERA_LZ = lz;
		},
		
		moveCamera: function() {
			var speed = 0.2;
			var target_x = (this.CAMERA_X - this.camera.position.x) * speed;
			var target_y = (this.CAMERA_Y - this.camera.position.y) * speed;
			var target_z = (this.CAMERA_Z - this.camera.position.z) * speed;
			
			this.camera.position.x += target_x;
			this.camera.position.y += target_y;
			this.camera.position.z += target_z;
			
			this.camera.lookAt( {x: this.CAMERA_LX, y: 0, z: this.CAMERA_LZ } );
		},
		
		animate: function() {
			// if( this.CAMERA_X != this.camera.position.x || 
			// 	this.CAMERA_Y != this.camera.position.y || 
			// 	this.CAMERA_Z != this.camera.position.z) {
			// 	this.moveCamera();	
			// }

		    //sphere.rotation.y=step+=0.01;
		    var delta = this.clock.getDelta();
		    this.orbitControls.update(delta);
			
			// find intersections
			// var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
			// this.projector.unprojectVector( vector, this.camera );
			// var raycaster = new THREE.Ray( this.camera.position, vector.subSelf( this.camera.position ).normalize() );
			// var intersects = raycaster.intersectObjects( this.scene.children );


			var camera = this.camera;

            var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
            vector = vector.unproject(camera);

            var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
            var intersects = raycaster.intersectObjects(this.scene.children);

            // console.log(intersects[0] && intersects[0].object && intersects[0].object.name);

			var objects = this.scene.children;

			if ( intersects.length > 0 ) {				// //background plane is 1, add a country will > 1;		
				if(this.INTERSECTED != intersects[ 0 ].object) { // recover last
					if (this.INTERSECTED) {
						for(i = 0; i < objects.length; i++) {
							if (objects[i].name == this.INTERSECTED.name && this.INTERSECTED.name) {
								(objects[i].material || objects[i].materials[0]).opacity = .5;
								objects[i].scale.z = 1;
							}
						}
						this.INTERSECTED = null;
					}
				}

				this.INTERSECTED = intersects[ 0 ].object; // highlight new
				for(i = 0; i < objects.length; i++) {
					if (objects[i].name == this.INTERSECTED.name && this.INTERSECTED.name) {
						(objects[i].material || objects[i].materials[0]).opacity = 1;
						objects[i].scale.z = 5;
					}
				}

			} else if (this.INTERSECTED) { // recover last
				for(i = 0; i < objects.length; i++) {
					if (objects[i].name == this.INTERSECTED.name && this.INTERSECTED.name) {
						(objects[i].material || objects[i].materials[0]).opacity = .5;
						objects[i].scale.z = 1;
					}
				}
				this.INTERSECTED = null;
			} 

			var linegroup = this.linegroup;
	        if(linegroup.length){
	            for(var i = 0;i<linegroup.length;i++){
	                var flyline = linegroup[i];
	                if(flyline && flyline.material.uniforms){
	                    var time = flyline.material.uniforms.time.value;
	                    var size = flyline.material.uniforms.size.value;
	                    if(time >= 1){
	                        flyline.material.uniforms.time.value = -size;
	                        flyline.material.uniforms.direction.value = !flyline.material.uniforms.direction.value;
	                    }
	                    flyline.material.uniforms.time.value += this.speed;
	                }
	            }
	        }
        

			this.render();
		},
		
		render: function() {

			// actually render the scene
			this.renderer.render(this.scene, this.camera);
		},

		getPointLoc: function (lng, lat) {
			var a = this.geo.path({"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[+lng, +lat],[0, 0]]]}});
			var m = a.split(/[M\,Z]/);
			var x = +m[1], y = +m[2];
			return [x, y, 0];
		},

		getPoints: function (point1, point2) { //贝塞尔曲线，获取一系列曲线上的点
			var num = 1000;
			var z = -100;
			var r = 2 / 3;
	        var p1 = [point1[0], point1[1], point1[2]];
	        var p2 = [point1[0] * r + point2[0] * (1 - r), point1[1] * r + point2[1] * (1 - r), point1[2] + z];
	        var p3 = [point1[0] * (1 - r) + point2[0] * r, point1[1] * (1 - r) + point2[1] * r, point2[2] + z];
	        var p4 = [point2[0], point2[1], point2[2]];
	        var threebsr = function(t, a1, a2, a3, a4) {
	            return a1 * (1 - t) * (1 - t) * (1 - t) + 3 * a2 * t * (1 - t) * (1 - t) + 3 * a3 * t * t * (1 - t) + a4 * t * t * t;
	        };
	        var ps = [];
	        for (var i = 0; i <= num; i++) {
	            ps.push([
	                threebsr(i / num, p1[0], p2[0], p3[0], p4[0]),
	                threebsr(i / num, p1[1], p2[1], p3[1], p4[1]),
	                threebsr(i / num, p1[2], p2[2], p3[2], p4[2])
	            ]);
	        }
	        return ps;
	    },

		drawLine: function (start, end) {
		    // console.log(this.getPointLoc(120, 30));
		    // console.log(this.getPointLoc(0, 0));
		    var ps = this.getPoints(this.getPointLoc(start.lng, start.lat), this.getPointLoc(end.lng, end.lat));
		    // console.log(ps);

			var lines = new THREE.Geometry();
	        var colors = [];

	        ps.forEach(function (e, i) {
	            lines.vertices.push(new THREE.Vector3(e[0], e[1], e[2]));
	            colors[i] = new THREE.Color(0xeeeeee);
	            // colors[i].setHSL(e[0] / 100 + 0.5, (  e[1] * 20 ) / 300, 0.8);
	        });

	        lines.colors = colors;
	        var material = new THREE.LineBasicMaterial({
	            opacity: 1.0,
	            linewidth: 1,
	            vertexColors: THREE.VertexColors
	        });

	        var line = new THREE.Line(lines, material);
	        // line.position.set(25, -30, -60);
	        this.transElement(line);
	        this.scene.add(line);

		},

	    addflyline: function (start, end){
	        // var curve = new THREE.CubicBezierCurve3(
	        //     new THREE.Vector3( minx, 0, minx ),
	        //     new THREE.Vector3( minx/2, maxx % 70 + 100, maxx/2 ),
	        //     new THREE.Vector3( maxx/2, maxx % 70 + 70, maxx/2 ),
	        //     new THREE.Vector3( maxx, 0, maxx )
	        // );
	        // var points = curve.getPoints( (maxx - minx) * 5  );
	        // 
	        
		    function createMaterial(vertexShader, fragmentShader) {
		        var vertShader = document.getElementById(vertexShader).innerHTML; //获取顶点着色器的代码
		        var fragShader = document.getElementById(fragmentShader).innerHTML; //获取片元着色器的代码

		        //配置着色器里面的attribute变量的值
		        var attributes = {};
		        //配置着色器里面的uniform变量的值
		        var uniforms = {
		            start: {type: 'f', value: 0},
		            end:{type:'f',value:25.0},
		            time: {type: 'f', value: 0}, // 0-2
		            size:{type:'f',value:.2}, // 0-1  .2表示全长的20%
		            direction:{type: 'f', value: false}, 
		        };

		        var meshMaterial = new THREE.ShaderMaterial({
		            uniforms: uniforms,
		            defaultAttributeValues : attributes,
		            vertexShader: vertShader,
		            fragmentShader: fragShader,
		            transparent: true
		        });

		        return meshMaterial;
		    };

	        var points = this.getPoints(this.getPointLoc(start.lng, start.lat), this.getPointLoc(end.lng, end.lat));
	        var vertexes = points.map(function (e, i) {
	            return new THREE.Vector3(e[0], e[1], e[2]);
	        });
	        var start = points[0][0];
	        var end = points[points.length - 1][0];
	        var geometry = new THREE.Geometry();
	        geometry.vertices = vertexes;
	        // geometry.colors = points.map(function(d) {return new THREE.Color(0x00ff00);});
	        var material = createMaterial("vertex-shader", "fragment-shader-7");
	        // var material = new THREE.PointCloudMaterial({
         //        size: 10,
         //        transparent: true,
         //        opacity: .6,
         //        vertexColors: true,

         //        sizeAttenuation: false,
         //        color: 0xff0000
         //    });
	        var flyline = new THREE.PointCloud( geometry, material );
	        flyline.material.uniforms.start.value = start;
	        flyline.material.uniforms.end.value = end;
	        flyline.material.uniforms.time.value = .95;


            // var geom = new THREE.Geometry();
            // var material = new THREE.PointCloudMaterial({
            //     size: 10,
            //     transparent: true,
            //     opacity: .6,
            //     vertexColors: true,

            //     sizeAttenuation: false,
            //     color: 0xff0000
            // });


            // var range = 500;
            // for (var i = 0; i < 150; i++) {
            //     var particle = new THREE.Vector3(Math.random() * range - range / 2, Math.random() * range - range / 2, Math.random() * range - range / 2);
            //     geom.vertices.push(particle);
            //     var color = new THREE.Color(0x00ff00);
            //     color.setHSL(color.getHSL().h, color.getHSL().s, Math.random() * color.getHSL().l);
            //     geom.colors.push(color);

            // }

            // var cloud = new THREE.PointCloud(geom, material);
            // this.scene.add(cloud);


	        flyline.start = start;
	        flyline.end = end;
	        this.linegroup.push(flyline);
	        this.transElement(flyline);
	        this.scene.add(flyline);
	    },
		drawLines: function () {
			var that = this;
	    	this.linegroup = [];
			// this.drawLine({lng: 120, lat: 30}, {lng: -10, lat: -40});
			var countries = Object.keys(latlngHash).filter(function (d) {
				return d.name !== 'China';
			});
			var start = latlngHash['China'];
			console.log(countries, start);
			countries.forEach(function (d) {
				// console.log(start, latlngHash[d])
				that.drawLine(start, latlngHash[d]);
				that.addflyline(start, latlngHash[d]);
			});


	    	// this.addflyline(start, {lat: -30, lng: 0});


			// var geometry = new THREE.SphereGeometry( 5, 32, 32 );
			// var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
			// var sphere = new THREE.Mesh( geometry, material );
	  //       // add the sphere to the scene
	  //       var beijingLoc = this.getPointLoc(116, 0);
	  //       console.log(beijingLoc);
	  //       sphere.position.set(beijingLoc[0], beijingLoc[2], beijingLoc[1]);
	  //       this.transElement(sphere);
	  //       this.scene.add(sphere);


			// var geometry = new THREE.SphereGeometry( 5, 32, 32 );
			// var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
			// var sphere = new THREE.Mesh( geometry, material );
	  //       // add the sphere to the scene
	  //       var beijingLoc = this.getPointLoc(116, 30);
	  //       console.log(beijingLoc);
	  //       sphere.position.set(beijingLoc[0], beijingLoc[2], beijingLoc[1]);
	  //       this.transElement(sphere);
	  //       this.scene.add(sphere);

			// var geometry = new THREE.SphereGeometry( 5, 32, 32 );
			// var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
			// var sphere = new THREE.Mesh( geometry, material );
	  //       // add the sphere to the scene
	  //       var beijingLoc = this.getPointLoc(116, -30);
	  //       console.log(beijingLoc);
	  //       sphere.position.set(beijingLoc[0], beijingLoc[2], beijingLoc[1]);
	  //       this.transElement(sphere);
	  //       this.scene.add(sphere);


		}
	};

	function init() {
		$.when(	$.getJSON("data/countries.json") ).then(function(data){ 
		// $.when(	$.getJSON("data/world.geo.json") ).then(function(data){ 
			
			worldMap = new Map();
			
			worldMap.init_d3();
			worldMap.init_tree();
			
			worldMap.add_light(0, 3000, 0, 1.0, 0xFFFFFF);		
			// worldMap.add_plain(1400, 700, 30, 0xEEEEEE);
			
			worldMap.add_countries(data);


			worldMap.drawLines();
			
			// request animation frame
			var onFrame = window.requestAnimationFrame;
	
			function tick(timestamp) {
				worldMap.animate();
				
				if(worldMap.INTERSECTED) {
					$('#country-name').html(worldMap.INTERSECTED.name);
				} else {
					$('#country-name').html("move mouse over map");
				}
				
				onFrame(tick);
			}
	
			onFrame(tick);
			
			document.addEventListener( 'mousemove', onDocumentMouseMove, false );
			window.addEventListener( 'resize', onWindowResize, false );
			
		});
	}
	
	function onDocumentMouseMove( event ) {

		event.preventDefault();

		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	}
	
	function onWindowResize() {
		
		windowHalfX = window.innerWidth / 2;
		windowHalfY = window.innerHeight / 2;

		worldMap.camera.aspect = window.innerWidth / window.innerHeight;
		worldMap.camera.updateProjectionMatrix();

		worldMap.renderer.setSize( window.innerWidth, window.innerHeight );
	}
	
	// window.onload = init;
	var latlngHash = {};
	d3.csv('./data/latlng.csv', function (data) {
		data.forEach(function (d) {
			latlngHash[d.name] = d;
		})
		init();
	});
		
}());