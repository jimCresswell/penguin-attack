
function preload() {
    var game = this.game;

    game.load.image('sky', 'resources/images/sky.png');
    game.load.image('ground', 'resources/images/ground.png');
    game.load.image('star', 'resources/images/star.png');
    game.load.spritesheet('penguin', 'resources/images/penguin.png', 41, 42, 64);
}

function create() {
    var game = this.game;
    var player;
    var stars;
    var platforms;
    var movingPlatform;
    var emitter;
    var scoreText;

    //  We're going to be using physics, so enable the Arcade Physics system.
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // Add sprites, groups and UI text.
    // Sprites and groups are added in visual order back of scene to front of scene.
    // A simple background for our game.
    game.add.sprite(0, 0, 'sky');
    emitter = game.jc.actors.emitter = game.add.emitter(0,0,200);
    platforms = game.jc.actors.platforms = game.add.group();
    stars = game.jc.actors.stars = game.add.group();
    player = game.jc.actors.player = game.add.sprite(32, game.world.height - 150, 'penguin');
    scoreText = game.jc.data.scoreText = game.add.text(16, 16, 'score: 0', {fill: '#000' });

    //  We will enable physics for any object that is created in this group.
    platforms.enableBody = true;

    // Here we create the ground.
    var ground = platforms.create(0, game.world.height - 64, 'ground');

    //  Scale it to fit the width of the game (the original sprite is 400x32 in size).
    ground.scale.setTo(2, 2);

    //  This stops it from falling away when you jump on it.
    ground.body.immovable = true;

    //  Ledges
    var ledge = platforms.create(600, 400, 'ground');
    ledge.body.immovable = true;
    ledge = platforms.create(-175, 250, 'ground');
    ledge.body.immovable = true;

    // Moving ledge, special instance of the platform group.
    movingPlatform = game.jc.actors.movingPlatform = platforms.create(500, 325, 'ground');
    movingPlatform.scale.setTo(0.25,1);
    movingPlatform.body.immovable = true;
    movingPlatform.body.collideWorldBounds = true;
    movingPlatform.body.velocity.x = -200;

    // Stars
    stars.enableBody = true;

    // Here we'll create `starCount` of them evenly spaced apart.
    for (var i = 0, star, starCount = game.jc.data.initialStarCount; i < starCount; i++) {

        //  Create a star inside of the 'stars' group
        star = stars.create(i * 70, 0, 'star');
    
        //  Let gravity do its thing
        star.body.gravity.y = 150;
    
        //  This just gives each star a slightly random bounce value
        star.body.bounce.x = 0.70 + Math.random() * 0.2;
        star.body.bounce.y = 0.70 + Math.random() * 0.2;

        // Keep stars in world
        star.body.collideWorldBounds = true;
    }

    //  We need to enable physics on the player.
    game.physics.arcade.enable(player);

    // Player physics properties. Give the little guy a slight bounce.
    player.body.maxVelocity.x = 400;
    player.body.bounce.x = 0.2;
    player.body.bounce.y = 0.2;
    player.body.gravity.y = 300;
    player.body.collideWorldBounds = true;
    player.anchor.set(0.5);

    //  Our two animations, walking left and right.
    player.animations.add('left', [53, 52, 51, ,50, 49, 48, 47, 46, 45, 44, 43, 42, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52], 60, true);
    player.animations.add('right',[12, 13, 14, ,15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13], 60, true);


    // Emitter
    emitter.makeParticles('star');
    emitter.minRotation = 200;
    emitter.maxRotation = 300;
    emitter.setScale(0.3, 0.6, 0.3, 0.6);
    emitter.gravity = 150;
    emitter.bounce.setTo(0.5, 0.5);

    // Keyboard control.
    game.jc.controls.cursors = game.input.keyboard.createCursorKeys();
}

// Called on every frame.
function update() {
    var game = this.game;
    var player = game.jc.actors.player;
    var emitter = game.jc.actors.emitter;
    var stars = game.jc.actors.stars;
    var platforms = game.jc.actors.platforms;
    var movingPlatform = game.jc.actors.movingPlatform;
    var scoreText = game.jc.data.scoreText;
    var cursors = game.jc.controls.cursors;
    var drag;
    var deltaSpeedX;

    // Collide the player and stars with the platforms.
    game.physics.arcade.collide(player, platforms);
    game.physics.arcade.collide(stars, platforms);
    game.physics.arcade.collide(emitter, platforms);

    // Check for player-star collisions
    game.physics.arcade.overlap(player, stars, collectStar, null, this);

    // Left and right movement physics and animation calls.

    // Recalculate acceleration.
    // Reset to 0 so that acceleration only applies when key is pressed.
    player.body.acceleration.x = 0;
    if (cursors.left.isDown) {
        if (player.body.touching.down) {
            //  Apply force to the left if on ground.
            player.body.acceleration.x = -250;
        } else {
            // Reduced control whilst airborn.
            player.body.acceleration.x = -150;
        }
        player.animations.play('left');
        starBurst(player, emitter);
    } else if (cursors.right.isDown) {
        if (player.body.touching.down) {
            //  Apply force to the right if on ground.
            player.body.acceleration.x = 250;
        } else {
            // Reduced control whilst airborn.
            player.body.acceleration.x = 150;
        }
        player.animations.play('right');
        starBurst(player, emitter);
    } else {
        //  Stop animation.
        player.animations.stop();
        player.frame = 4;
    }

    // Apply drag.
    // Will only apply if an acceleration is not being applied.
    if (player.body.touching.down) {
        player.body.drag.x = 100;
    } else {
        player.body.drag.x = 50;
    }

    //  Allow the player to jump if they are touching the ground.
    if (cursors.up.isDown && player.body.touching.down) {
        player.body.velocity.y = -350;
    }

    // Allow the moving platform to change direction.
    // Blocked for world bounds or tiles, touching for bodies.
    if (movingPlatform.body.blocked.left || movingPlatform.body.touching.left) {
        movingPlatform.body.velocity.x = 200;
    } else if (movingPlatform.body.blocked.right || movingPlatform.body.touching.right) {
        movingPlatform.body.velocity.x = -200;
    }

    // Check for game end condition.
    if (game.jc.actors.stars.countLiving() <= 0) {
        var endText = game.add.text(320, 350, 'YOU WIN!', {
            fill: 'red'
        });
        endText.fontSize = 50;
        endText.angle = -25;
    }
}

// Star-player collision callback.
function collectStar (player, star) {

    // Removes the star from the screen.
    star.kill();

    //  Add and update the score
    this.game.jc.data.score += 10;
    this.game.jc.data.scoreText.text = 'Score: ' + this.game.jc.data.score;
}

// Fire the particle emitter 'attached' to the player.
function starBurst(player, emitter) {
    emitter.x = player.x;
    emitter.y = player.y + 12;
    emitter.start(true, 500, null, 2);
}

// Instantiate the game.
var __game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

// Custom object references and game state.
__game.jc = {};
__game.jc.actors = {
    player: null,
    platforms: null,
    movingPlatform: null,
    stars: null,
    emitter: null
};
__game.jc.data = {
    initialStarCount: 12,
    scoreText: null,
    score: 0
}
__game.jc.controls = {
    cursors: null
}