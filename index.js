const express = require('express');
const hbs = require('hbs');
const waxOn = require('wax-on');
const { createConnection } = require('mysql2/promise');
require('dotenv').config();

waxOn.on(hbs.handlebars);
waxOn.setLayoutPath("./views/layouts");

const app = express();

// <-- inform Express that we are using hbs as our view engine
app.set('view engine', 'hbs');

async function main() {
    // create a connection to our MySQL database
    const connection = await createConnection({
        'host': process.env.DB_HOST,
        'user': process.env.DB_USER,
        'database': process.env.DB_NAME,
        'password': process.env.DB_PASSWORD
    });

    app.get('/', function (req, res) {
        res.render('index')
    })

    app.get('/customers', async function(req,res){
        // SQL to execute: SELECT * FROM Customers
        const query = `SELECT * FROM Customers JOIN 
                        Companies ON Companies.company_id = Customers.company_id
                    `;
    
        // INSTEAD OF:
        // const results = await connection.execute(query);
        // // connection.execute will return an array
        // // index 0 will be an array of our records that we want
        // const customers = results[0];

        // we can use array destructring to just take the
        // first result from an array
        const [customers] = await connection.execute({
            'sql': query,
            'nestTables': true
        });

        console.log(customers);

        res.render('customers.hbs', {
            "allCustomers": customers
        })
    })

   
}
main();

app.listen(3000, function () {
    console.log("Server has started");
})