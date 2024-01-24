import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

//color pallet: https://colorhunt.co/palette/3d3b40525cebbfcfe7f8edff
//logo ninja: https://api-ninjas.com/api/logo

const app = express();
const port = 3000;

//middlewear 
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

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

var current_user = {};
var current_error = "";

let allCompanies = await axios.get("http://588fc30f7458d612002df0d2.mockapi.io/api/v1/companies");
allCompanies = allCompanies.data;
console.log(allCompanies.length);

async function getCompany (name) {

}

async function authenticate (name, password){
    try {
        var trueName = await db.query("SELECT * FROM users WHERE name=$1", [name]);
        if(trueName.rows[0]) {
            if(trueName.rows[0].password == password) {
                current_user = trueName.rows[0];
                return true; //login successful
            }
            else {
                return false; //wrong password
            }
        }
        else {
            return "User does not exist" //username was not found
        }
    } catch (error) {
        console.log(error);
    }
}
app.get("/", (req, res) => { //sends user to login page
    if(current_error!="") {
        res.render("login.ejs", {error: current_error});
        current_error = "";
    }
    else {
        res.render("login.ejs");
    }
});
app.post("/play", async (req, res) => { //user authenticated = play, not = backl to login
    const name = req.body.name;
    const password = req.body.password;
    
    const auth = await authenticate(name, password);

    if(typeof auth === typeof String()) {
        current_error = auth;
        res.redirect("/"); //User does not exist
    }
    else if(auth) { // authenticated
        console.log(auth);
        const randomNumber = Math.trunc(100 * Math.random() + 1);
        var selectedCompany = allCompanies[randomNumber];
        res.render("play.ejs", {selectedCompany: selectedCompany, current_user: current_user});
    }
    else { //wrong password
        current_error = "Wrong pasword, try again" 
        res.redirect("/");
    }

    
});


app.listen(port, () => {
    console.log(`Port ${port} is up and running!`)
})
