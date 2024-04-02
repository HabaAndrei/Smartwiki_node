const {milisecGreenwich} = require('./diverse.js');
const {client_db} = require('./configDB.js')
const stripe = require('stripe')('sk_test_51KBz2TLpkRDhf4wTpBKPXYw0tBgXflhHEDLRatHvyj9kvShVUtpXAHjteDj74hkzLXkFmZdHtxmZnW5IArM8rE9N001f7EY0YS');


function handle_payments_completed(object){

    // obWithStatus.data.object.customer_creation :   if_required / always
    // obWithStatus.data.object.mode :  payment / subscription
    // 
    // obWithStatus.data.object.mode => 'daca a fost subscriptie sau plata'
    // obWithStatus.data.object.customer_details
    // obWithStatus.data.object.amount_total  
    const obCuProduse = {
        10: 0, 4: 500, 2: 200
    }
    

    const {customer_creation , mode , customer_details, amount_total, subscription} = object;

    if(customer_creation === 'if_required' && mode === 'payment'){
        let nrCredite = obCuProduse[amount_total / 100];
        // inserez si in credite numarul de tokeni 
        client_db.query(`
        begin;
        with uid as (
            select uid from useri where email = '${customer_details.email}'
            ) 
            insert into credite (uid, ora, nr_credite) select uid, ${milisecGreenwich()}, ${nrCredite} from uid;
            insert into buy_credit (email, ora, mode, nr_tokeni, id_subscription)  
            values ('${customer_details.email}', ${milisecGreenwich()}, '${mode}', ${nrCredite}, '${subscription}' );  
        commit; 
        `, (err, data)=>{
            if(err){
                console.log(err)
            }else{
                // console.log(data);
            }
        })
    }else if(customer_creation === 'always' && mode === 'subscription'){
        // inserez doar in buy_tokeni
        let nrCredite = obCuProduse[amount_total / 100];
        client_db.query(`
        insert into buy_credit (email, ora, mode, nr_tokeni, id_subscription, status_ab)  
            values ('${customer_details.email}', ${milisecGreenwich()}, '${mode}', ${nrCredite}, '${subscription}', 'activ' );  
        `, (err, data)=>{
            if(err){
                console.log(err)
            }else{
                // console.log(data);
            }
        })
    }
    
}

async function cancelSubscription(obCuDet) {
    const {id_subscription, email} = obCuDet;
    // console.log(id_subscription, email)
    try {
        const subscription = await stripe.subscriptions.cancel(id_subscription);
        if (subscription.status === 'canceled') {
            return new Promise((resolve, reject) => {
                client_db.query(`
                    update buy_credit set status_ab = 'canceled' where email = $1
                    and mode = 'subscription' and id_subscription = $2
                `, [email, id_subscription], (err, data) => {
                    if (err) {
                        console.log(err);
                        reject(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        }
    } catch (err) {
        console.log(err);
        return false;
    }
}

// cancelSubscription('sub_1OxnIlLpkRDhf4wTAtHVNzII');

module.exports = {handle_payments_completed, cancelSubscription}