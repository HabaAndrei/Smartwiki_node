// sa pun cheia de productie !!!!!!!!!!!!!!!!!!!!!!!
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_API_KEY);

//////////// creez sesiune de plata
function pornesteServerStripe(app){

  let produse = [{nume: 'Small package', idProdus: 'price_1P0qTiLpkRDhf4wTrOgurXzM', plata: 'payment'}, 
  {nume: 'Normal package' ,idProdus: 'price_1P0qUWLpkRDhf4wTAoBMoY05', plata: 'payment'}, 
  {nume: 'Large package' ,idProdus: 'price_1P0qV4LpkRDhf4wToFT7Ah9d', plata: 'subscription'}]


  app.post('/create-checkout-session', async (req, res) => {

    const idProdus = req.query.param;
    let ob = {};
    produse.forEach((obiect, index)=>{
      if(obiect['idProdus'] == idProdus)ob = produse[index]
    });

	// ------------- 

	console.log(ob.idProdus, ob.plata)
	// --------------

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: ob.idProdus,
          quantity: 1,
        },
      ],
      mode: ob.plata,
      success_url: `https://smartwiki.site/chat?met=succes`,
      cancel_url: `https://smartwiki.site/chat?met=cancel`,
    });
   
    res.redirect(303, session.url);
  });
  
}

module.exports = {pornesteServerStripe};
