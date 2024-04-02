// Ensure the key is kept out of any version control system you might be using.
require('dotenv').config();

const { handle_payments_completed} = require('./handle_payments.js')
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
// This is your Stripe CLI webhook secret for testing your endpoint locally.
const endpointSecret = "whsec_24b2478afda1ad9211507d7d33f20df487e3f2d0aa90a2f0ff7fbc012a7db795";
// const bodyParser = require('body-parser');


function catchHooks(app ){
    app.post('/webhook' ,(req, res) => {

        // const sig = request.headers['stripe-signature'];

        const obWithStatus = req.body;
        // console.log( '------ >>>>>>>>>' ,{obWithStatus} , '  <<<<<<<---------')
        switch(obWithStatus.type){

            case 'checkout.session.completed':

                console.log('am rimti o plata pt:  ',obWithStatus.data.object.mode)
                // console.log(obWithStatus)
               handle_payments_completed(obWithStatus.data.object)
                
                break;
        }
        
        // trebuie sa fac cod pt atunci cand primesc mesaj ca s-a facut plata pt reainoirea de abonament 
        // sau poate ca este tot acesta bun 
        res.json({received: true});
    });

}
module.exports = {catchHooks};
