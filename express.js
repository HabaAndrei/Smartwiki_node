const express = require('express');
const cors = require('cors');
const {client_db} = require('./configDB.js');
const {pornesteServerStripe} = require('./pay_redirect.js')
const {catchHooks} =require('./pay_hooks.js');
const {milisecGreenwich} = require('./diverse.js');
const {cancelSubscription} = require('./handle_payments.js')


const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));
pornesteServerStripe(app);
catchHooks(app);


/////////////////////////////////////////
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
})
////////////////////////////////////////////
app.post('/insertDateU_email_password', (req, res)=>{
   		
	console.log('AAAAAAAAAA         AAAAAAAAA JUNS CEREREA DECI E OKKKKKKKKKKKKKKKK')

    const {email, name, uid, milisec, metoda_creare } = req.body;
    client_db.query(`
    begin;
    insert into useri ( email, nume, uid, oracreare, metoda_creare) values  ('${email}', '${name}', '${uid}', ${milisec}, '${metoda_creare}');
    insert into credite (uid, ora, nr_credite) values ('${uid}', ${milisec}, 10);
    commit;
    `, 
    (err, data)=>{
        if(err){
            console.log(err)
        }else{
            res.send('ok');
        }
    })
})


app.post('/insertDateU_google', (req, res)=>{
    // uid: user.uid, email:user.email, name: user.displayName, milisec,  metoda_creare: 'google'
    const {uid, email, name, milisec, metoda_creare} = req.body;
    // console.log({uid, email, name, milisec, metoda_creare})
    client_db.query(`
    DO $$ 
    DECLARE 
    nr integer;
    rezultat record;
    BEGIN 

    SELECT count(*) INTO nr FROM useri WHERE uid = '${uid}';

    IF nr > 0 THEN
        SELECT sum(nr_credite) INTO rezultat FROM credite WHERE uid  = '${uid}';
    ELSE 
        INSERT INTO useri (email, nume, uid, oracreare, metoda_creare) VALUES ('${email}', '${name}', '${uid}', ${milisec}, '${metoda_creare}');
        INSERT INTO credite (uid, ora, nr_credite) VALUES ('${uid}', ${milisec}, 10);
    END IF;

    RAISE NOTICE '%', rezultat;
    END $$;

    
    
    `, (err, data)=>{
        if(err){
            console.log(err)
        }else{
            // console.log(data);
            res.send('okokokokok');
        }
    })
})
app.post(`/dateDespreAbonament`, (req, res)=>{
    const {uid} = req.body;
    // 2_764_800_000 => 32 de zile    
    const inainteCu32Zile = milisecGreenwich() - 2_764_800_000 

    client_db.query(`
    with inf_ab as (
        with email as (
        select email from useri where uid = $1
    )
    select a.ora as ora_inceput_abonament, a.email, a.mode, a.id_subscription, a.status_ab from buy_credit a 
    where a.email IN (SELECT email FROM email)
                     and a.mode = 'subscription' and a.ora > $2 
    )
    select a.ora_inceput_abonament, a.email, a.id_subscription, a.status_ab from inf_ab a     
    `, [uid, inainteCu32Zile], (err, data)=>{
        if(err){
            console.log(err)
        }else{
            res.send(data.rows);
        }
    })
})
  
app.post(`/getInfoAboutU`, (req, res)=>{
    const {uid} = req.body;

    client_db.query(`
    select d.nume, d.oracreare as ora_creare_cont, c.sum as nr_tokeni from useri d
    join (select uid, sum(nr_credite) from credite group by uid) c on c.uid = d.uid
    where d.uid = $1;
    `, [uid], (err, data)=>{
        if(err){
            console.log(err)
        }else{
            res.send(data.rows);
            // res.send('ok');
        }
    })
})

app.post('/stocamMesInDb', (req, res)=>{
    const {arMes, id_conversatie, data, uid} = req.body;
    for(obiect of arMes){
        obiect.id_conversatie = id_conversatie;
        obiect.data = data;
    }
    
    const query = `
    INSERT INTO mesaje (mesaj, tip_mesaj, id_conversatie, data)
    SELECT (json_data->>'mesaj')::text, (json_data->>'tip_mesaj')::text, (json_data->>'id_conversatie')::text,
    (json_data->>'data')::numeric 
    FROM json_array_elements($1::json) AS json_data`;
    client_db.query(query, [JSON.stringify(arMes)], (err, ok)=>{
        if(err){
            console.log(err)
        }else{
            client_db.query(`insert into credite (uid, ora, nr_credite) values ($1, $2, $3)`, [uid, data, -1], (err, data)=>{
                if(err){
                    console.log(err, 'la al doilea query')
                }else{
                    res.send('totul a fost cu succes!!')
                }
            })
        }
    })
})

app.post('/stocamConversatiaInDb', (req, res)=>{
    const {uid, id_conversatie, data} = req.body
    client_db.query('insert into conversatii (id_conversatie, uid, data)  values ($1, $2, $3)', [id_conversatie, uid,data],(err, data)=>{
        if(err){
            console.log(err)
        }else{
            res.send('am stocat ok');
        }
    })
})

app.post(`/luamConv`, (req, res)=>{

	console.log('a ajuns cererea la luamConv', req.body)
    const {uid} = req.body;

    client_db.query(
        `
        with a as (select a.mesaj, a.id_conversatie, a.id from mesaje a 
        join ( select min(id) , id_conversatie from mesaje group by id_conversatie ) as b on b.min = a.id and
            b.id_conversatie = a.id_conversatie)  
        select a.mesaj, a.id_conversatie  from a 
        join ( select id_conversatie from conversatii where uid = $1) as b 
            on b.id_conversatie = a.id_conversatie    order by a.id;
        `,[uid] ,(err, data)=>{
            if(err){
                console.log(err)
            }else{
                res.send(data.rows);
            }
        }
    )
})

app.post('/luamMesDupaIdConv', (req, res)=>{
    const {id_conversatie} = req.body;
    client_db.query(`select mesaj, tip_mesaj, data from mesaje  where id_conversatie = $1  order by id `, [id_conversatie], (err, data)=>{
        if(err){
            console.log(err)
        }else{
            res.send(data.rows);
        }
    })
})

app.post('/stergemConversatia', (req, res)=>{
    const {id_conversatie} = req.body;

    client_db.query(`delete from conversatii where id_conversatie = '${id_conversatie}';
    delete from mesaje where id_conversatie = '${id_conversatie}';
    `,  (err, data)=>{
        if(err){
            console.log(err)
        }else{
            res.send('am sters ok')
        }
    })
})

app.post('/stergemSubscriptia', async (req, res)=>{
    const raspuns = await cancelSubscription(req.body);
    if(raspuns)res.send('ok')
    else res.send('nu');
    // res.send('a ajuns cererea')
})
app.post(`/luamIstoricCredite`, (req, res)=>{
    const {uid} = req.body;

    client_db.query(`select ora, nr_credite from credite where uid = $1 ORDER BY id desc  limit 100 `, [uid], (err, data)=>{
        if(err){
            console.log(err)
        }else{
            res.send(data.rows);
        }
    })
})

app.post(`/luamIstoricBuy`, (req, res)=>{
    const {email} = req.body;

    client_db.query(`select ora, mode, nr_tokeni, status_ab from buy_credit where email = $1 ORDER BY id desc limit 100`, [email], (err, data)=>{
        if(err){
            console.log(err)
        }else{
            res.send(data.rows);
        }
    })
})


const PORT = 5010;
app.listen(PORT, ()=>{
        console.log('Ascultam pe portul', PORT)
    }
)
