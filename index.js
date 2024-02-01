import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
import bcrypt from 'bcrypt';
import session from 'express-session';
import passport from 'passport';
import { Strategy } from 'passport-local';

dotenv.config();



//color pallet: https://colorhunt.co/palette/3d3b40525cebbfcfe7f8edff
//logo ninja: https://api-ninjas.com/api/logo

const app = express();
const port = 3000;
const saltRounds = 10;

var current_company = {};
var current_score = 0;

//middlewear 

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
}))

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

//database
const db = new pg.Client({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    database: process.env.DATABASE_DATABASE,
    password: process.env.DATABASE_PASSWORD,
    port: process.env.DATABASE_PORT,
    ssl: true,
})

db.connect();

//variables to keep track of data


let allCompanies = await axios.get("http://588fc30f7458d612002df0d2.mockapi.io/api/v1/companies");
allCompanies = allCompanies.data;

async function getCompany (name) {
    try {
        const nameSplit = name.split(" "); //just in case the company name is wrong
        var company = await axios.get("https://api.api-ninjas.com/v1/logo?name=" + (name || nameSplit[0]), {
        headers:{
            'X-Api-Key': process.env.API_KEY,
        }})
       current_company = company.data[0];
       console.log(current_company);
    } catch (error) {
        console.log(error);
    }
}

async function getScore(id) {
    try {
        const result = await db.query("SELECT highscore FROM users WHERE id=$1", [id]);
        console.log(result.rows);
    } catch (error) {
        
    }
}



async function addPoint(id, score){
    try {
        console.log(id, "brudda"); // not working because value is null
        await db.query("UPDATE users SET highscore = $1 WHERE id= $2", [score, id]);
    } catch (error) {
        console.log("error");
    }
}

async function getLeaderboard() {
    try {
        const leaderboard = await db.query("SELECT name, highscore FROM users ORDER BY highscore DESC LIMIT 5");
        return leaderboard.rows;
    } catch (error) {
        console.log(error);
    }
}


app.get("/", (req, res) => { //sends user to login page
    res.render("login.ejs");
});
app.post("/login", (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: "/play",
        failureRedirect: "/",
    })(req, res, next);
});

app.get("/signup", (req, res) => {
    res.render("signup.ejs"); //redirects to signup page which redirects to /play
});
app.post("/signup", async (req, res) => {
    const name = req.body.username;
    const password = req.body.password;
    await bcrypt.hash(password, saltRounds, async (err, result) => { //hashed password
        if (err) {
            console.log(err);
        }
        else {
            try {
                console.log(name, result);
                const newUser = await db.query("INSERT INTO users (name, password) VALUES ($1, $2) RETURNING *", [name, result]);
                req.login(newUser.rows[0], (err) => {
                    console.log("success");
                    res.redirect("/play");
                })
            } catch (error) {
                console.log(error);
                res.render("signup.ejs", {error: "Username taken, try again"});
            }
        }
    })
});

app.get("/play", async (req, res) => { //user authenticated = play, not = backl to login
    if(req.isAuthenticated()){
        var randomNumber = Math.trunc(100 * Math.random());
        await getCompany(allCompanies[randomNumber].name);
        while(current_company==undefined){
            randomNumber = Math.trunc(100 * Math.random());
            await getCompany(allCompanies[randomNumber].name);
        }
        await getScore();
        console.log(req.user);
        res.render("play.ejs", {selectedCompany: current_company, current_user: req.user, score: current_score}); //current_company has {name, ticker, image}, current_user has {id, name, score}
    }
    else {
        res.redirect("/");
    }

    

    
});

app.post("/play", async (req, res) => {
    if(req.body.company_guess){
        if(req.body.company_guess.toLowerCase() == current_company.name.toLowerCase() || current_company.name.split(" ")[0].toLowerCase() == req.body.company_guess.toLowerCase()) {
            current_score+=1;
        }
        else {
            if(current_score > parseInt(req.user.highscore)){
                await addPoint(req.user.id, current_score);
            }
            current_score = 0;
        }
    }
    res.redirect("/play");
});

app.get("/logout", async (req, res) => {
    req.logout(function (err) {
        if (err) {
          return next(err);
        }
        res.redirect("/");
      });
})

app.get("/leaderboard", async (req, res) => {
    var leaderboard = await getLeaderboard();
    res.render("leaderboard.ejs", {leaderboard: leaderboard});
});

passport.use("local", new Strategy(async function verify (username, password, cb) {

    console.log("hi");
    var trueName = await db.query("SELECT * FROM users WHERE name=$1", [username]);
    if(trueName.rows[0]) {
        bcrypt.compare(password, trueName.rows[0].password, (err, result) => {
            console.log(result);
            if (err) {
                return cb(err);
            }
            else {

                if (result) {
                    return cb(null, trueName.rows[0]);
                    
                }
                else {
                    return cb(null, "Wrong pasword, try again"); //wrong password
                    
                }
            }
            
        })
    }
    else {
        return("User Not Found"); //User does not exist
        res.redirect("/"); //User does not exist
    }
}))

// do not understand whagt cb does !!!!

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});


app.listen(port, () => {
    console.log(`Port ${port} is up and running!`)
})
