// Kaboom Space Invaders - Full Game with Features
import kaboom from "https://unpkg.com/kaboom@3000.0.0-beta.1/dist/kaboom.mjs"

kaboom({ background: [0, 0, 0] })

// Load assets
loadSprite("player", "https://kaboomjs.com/sprites/bean.png")
loadSprite("enemy", "https://kaboomjs.com/sprites/ghosty.png")
loadSprite("enemy_laser", "images/bluelaser.png")
loadSprite("player_laser", "images/greenlaser.png")
loadSprite("heart", "images/health.png")
loadSprite("boss", "https://kaboomjs.com/sprites/mushroom.png")
loadSprite("powerup", "https://kaboomjs.com/sprites/coin.png")
loadSound("shoot", "sounds/laser.mp3")
loadSound("explosion", "sounds/laser.mp3")
loadSound("music", "sounds/music.mp3")

let highScore = 0
let currentLevel = 1
const maxLevel = 4
let music = null
let isMuted = false

scene("instructions", () => {
    add([
        text("INSTRUCTIONS\n\n- Arrow keys to move\n- Space to shoot\n- Avoid enemy bullets\n- Grab coins\n- Beat all levels!\n\nPress Enter to Start\nPress M to toggle music", { size: 28, align: "center" }),
        pos(center()),
        anchor("center"),
    ])

    onKeyPress("enter", () => go("main", { level: 1, lives: 3, score: 0 }))
})

scene("bossIntro", ({ level, lives, score }) => {
    add([
        text("FINAL BOSS!\n\nAvoid its attacks.\nOnly shoot when it's flashing red.\nIf you hit the boss when it's not vulnerable, it will get stronger!\n\nPress Enter to Begin", { size: 28, align: "center" }),
        pos(center()),
        anchor("center"),
    ])

    onKeyPress("enter", () => go("main", { level, lives, score, bossIntroShown: true }))
})

scene("main", ({ level, lives, score, bossIntroShown }) => {
    if (!music && !isMuted) music = play("music", { loop: true })
    if (music) music.paused = isMuted

    const SPEED = 320
    const BULLET_SPEED = 500
    let enemySpeed = 60 + level * 20
    let enemyDirection = 1
    let shootInterval = 1.5 - level * 0.2
    const isBossLevel = level === maxLevel
    let bossVulnerable = false
    let boss

    const player = add([
        sprite("player"),
        pos(center().x, height() - 50),
        area(),
        health(3),
        "player"
    ])

    // UI
    const scoreText = add([text(`Score: ${score}`, { size: 20 }), pos(12, 8)])
    const lifeIcons = []
    for (let i = 0; i < lives; i++) {
        lifeIcons.push(add([sprite("heart"), pos(12 + i * 40, 32), scale(0.75)]))
    }

    const updateLives = () => {
        lifeIcons.forEach((icon) => destroy(icon))
        for (let i = 0; i < lives; i++) {
            lifeIcons.push(add([sprite("heart"), pos(12 + i * 40, 32), scale(0.75)]))
        }
    }

    onKeyDown("left", () => {
        if (player.pos.x > 0) player.move(-SPEED, 0)
    })
    onKeyDown("right", () => {
        if (player.pos.x < width() - player.width) player.move(SPEED, 0)
    })

    let canShoot = true;
const shootCooldown = 0.3;

onKeyPress("space", () => {
    if (!canShoot) return;
    canShoot = false;
    wait(shootCooldown, () => canShoot = true);

    play("shoot");
    add([
            sprite("player_laser"),
            pos(player.pos.x, player.pos.y - 20),
            area(),
            move(UP, BULLET_SPEED),
            offscreen({ destroy: true }),
            "playerBullet"
        ])
    })

    onKeyPress("m", () => {
        isMuted = !isMuted
        if (music) music.paused = isMuted
    })

    if (isBossLevel && !bossIntroShown) {
        return go("bossIntro", { level, lives, score })
    }

    if (isBossLevel) {
        boss = add([
            sprite("boss"),
            pos(center().x, 80),
            area(),
            health(20),
            "enemy",
            "boss"
        ])

        const bossBar = add([
            rect(width() - 40, 16),
            pos(20, 60),
            color(RED),
            outline(2),
            { max: 20, update() { this.width = ((boss.hp() / this.max) * (width() - 40)) } }
        ])

        loop(0.05, () => {
            bossBar.hidden = !boss.exists()
        })

        let moveDir = 1
        onUpdate(() => {
            if (boss.exists()) {
                boss.move(moveDir * 80, 0)
                if (boss.pos.x < 0 || boss.pos.x > width() - 48) moveDir = -moveDir
            }
        })

        loop(3, () => {
            if (!boss.exists()) return
            bossVulnerable = true
            boss.color = rgb(255, 0, 0)
            wait(1, () => {
                if (!boss.exists()) return
                play("shoot")
                for (let i = -1; i <= 1; i++) {
                    add([
                        sprite("enemy_laser"),
                        pos(boss.pos.x + i * 20, boss.pos.y + 10),
                        area(),
                        move(DOWN, 300),
                        offscreen({ destroy: true }),
                        "enemyBullet"
                    ])
                }
                boss.color = rgb(255, 255, 255)
                bossVulnerable = false
            })
        })
    } else {
        for (let i = 0; i < 10 + level * 3; i++) {
            const x = rand(40, width() - 40)
            const y = rand(40, height() / 2)
            add([
                sprite("enemy"),
                pos(x, y),
                area(),
                health(1),
                "enemy"
            ])
        }

        loop(shootInterval, () => {
            const shooters = get("enemy")
            if (shooters.length === 0) return
            const shooter = choose(shooters)
            add([
                sprite("enemy_laser"),
                pos(shooter.pos.x, shooter.pos.y + 10),
                area(),
                move(DOWN, 300 + level * 40),
                offscreen({ destroy: true }),
                "enemyBullet"
            ])
        })
    }

    onUpdate(() => {
        let reachedEdge = false
        get("enemy").forEach((e) => {
            if (!e.is("boss")) e.move(enemyDirection * enemySpeed, 0)
            if (e.pos.x < 0 || e.pos.x > width() - 32) reachedEdge = true
            if (e.pos.y > height() - 80) go("lose", { score })
        })

        if (reachedEdge) {
            enemyDirection = -enemyDirection
            get("enemy").forEach((e) => e.move(0, 20))
        }
    })

    loop(6, () => {
        add([
            sprite("powerup"),
            pos(rand(0, width()), 0),
            area(),
            move(DOWN, 100),
            offscreen({ destroy: true }),
            "powerup"
        ])
    })

    onCollide("player", "powerup", (p, pow) => {
        destroy(pow)
        score += 250
        scoreText.text = `Score: ${score}`
    })

    onCollide("playerBullet", "enemy", (b, e) => {
        destroy(b)
        if (e.is("boss") && !bossVulnerable) {
            e.hurt(-0.35)  // heal boss slightly if hit at wrong time
            return
        }
        e.hurt(1)
        addExplode(e.pos)
        if (e.hp() <= 0) {
            destroy(e)
            score += 100
            scoreText.text = `Score: ${score}`
            if (get("enemy").length === 0) {
                if (level < maxLevel) {
                    go("main", { level: level + 1, lives, score })
                } else {
                    highScore = Math.max(score, score)
                    go("win", { score })
                }
            }
        }
    })

    onCollide("enemyBullet", "player", () => {
        lives--
        updateLives()
        addExplode(player.pos)
        if (lives <= 0) go("lose", { score })
    })
})

scene("win", ({ score }) => {
    add([
        text(`YOU WIN!\nScore: ${score}\nHigh Score: ${highScore}\n\nEnter to Replay`, { size: 28, align: "center" }),
        pos(center()),
        anchor("center")
    ])
    onKeyPress("enter", () => go("instructions"))
})

scene("lose", ({ score }) => {
    add([
        text(`GAME OVER\nScore: ${score}\nHigh Score: ${highScore}\n\nEnter to Restart`, { size: 28, align: "center" }),
        pos(center()),
        anchor("center")
    ])
    onKeyPress("enter", () => go("instructions"))
})

function addExplode(p) {
    add([
        pos(p),
        rect(12, 12),
        color(RED),
        lifespan(0.2, { fade: 0.1 }),
    ])
}

go("instructions")