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

// setup form processing for Express
// VERY IMPORTANT!
app.use(express.urlencoded({
    extended: false // set to false for fast form processing but without advanced features
}))

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

    app.get('/customers', async function (req, res) {
        // SQL to execute: SELECT * FROM Customers
        const query = `SELECT * FROM Customers JOIN 
                        Companies ON Companies.company_id = Customers.company_id
                        ORDER BY Customers.customer_id DESC
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



        res.render('customers.hbs', {
            "allCustomers": customers
        })
    })

    // In a dynmaic web app, for form processing, there are always 2 routes
    // 1st route -> display the form (GET)
    // 2nd route -> process the form (POST)

    // display the form
    app.get('/customers/create', async function (req, res) {
        const [companies] = await connection.execute("SELECT * FROM Companies")
        console.log(companies);
        res.render('create_customer', {
            'companies': companies
        });
    })

    // process the form
    app.post('/customers/create', async function (req, res) {
        //  const first_name = req.body.first_name;
        //  const last_name = req.body.last_name;
        //  const rating = req.body.rating;
        //  const company_id = req.body.company_id;
        // Instead we can use object structuring
        const { first_name, last_name, rating, company_id } = req.body;

        // WARNING: DON'T USE THE CODE BELOW, IT'S SUSPECTIBLE TO SQL INJECTION ATTACKS
        // const query = `INSERT INTO Customers (first_name, last_name, rating, company_id) VALUES ("${first_name}", 
        //             "${last_name}", ${rating}, ${company_id})`;
        // console.log(query);
        // const results = await connection.execute(query);

        // INSTEAD, we'll use PREPARED STATEMENTS
        const query = "INSERT INTO Customers (first_name, last_name, rating, company_id) VALUES (?, ?, ?, ?);"
        const results = await connection.execute(query, [first_name, last_name, rating, company_id]);

        // tell the front end to go this particular route
        res.redirect('/customers');
    })

    app.get('/customers/:customer_id/delete', async function (req, res) {
        const customer_id = req.params.customer_id;

        // NOTE: To delete customers we have to delete all their relationship first
        const [relatedEmployees] = await connection.execute(
            "SELECT * FROM EmployeeCustomer WHERE customer_id =?",
            [customer_id]);

        if (relatedEmployees.length > 0) {
            res.render('errors', {
                'errorMessage': "There are still employees serving this customers, hence we cannot delete"
            })
            return;
        }

        // connection.execute("SELECT * ....") will return an array, even if there is only result
        const [customers] = await connection.execute(
            "SELECT * FROM Customers WHERE customer_id = ?",
            [customer_id]);
        const customerToDelete = customers[0];
        res.render('confirm_delete_customer', {
            'customer': customerToDelete
        }
        )
    })

    app.post("/customers/:customer_id/delete", async function (req, res) {

        try {
            const query = "DELETE FROM Customers WHERE customer_id = ?";
            await connection.execute(query, [req.params.customer_id]);
            res.redirect("/customers");
        } catch (e) {
            res.render('errors', {
                'errorMessage': "Unable to delete customer"
            })
        }

    })

}
main();

app.listen(3000, function () {
    console.log("Server has started");
})