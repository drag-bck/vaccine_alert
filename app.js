const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const app = express();
const sgMail = require('@sendgrid/mail');
const compression = require('compression');
const helmet = require('helmet');
const path = require('path');

const port = process.env.PORT||3000;
app.use(compression());
app.use(helmet());

const emailList = ["kmr.ammit@gmail.com"];
const centerId = 713397;

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname+'/index.html'));
});

app.listen(port, function () {
    console.log('Vaccine service on port 💣',port);
    cron.schedule('*/5 * * * *', () => {
        console.log(new Date().toLocaleTimeString());
        checkAvailability();
    });
  });


function checkAvailability () {
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    axios.get(`https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=650&date=${date}`)
    .then((res) => {
        const centerData = res.data.centers.filter((item) => item.center_id ==  centerId);
        let flag = false;
        let result = centerData[0].sessions.map((item) => {
            if(item.available_capacity_dose1 > 0){
                flag = true;
                return `Available, ${item.date}, ${item.available_capacity_dose1}`;
            } else {
                return `Unavailable, ${item.date}, ${item.available_capacity_dose1}`;
            }
        });
        if(flag) {
            mailGun(emailList, result, false);
        }
    })
    .catch((err) => {
        console.log('ERROR: AXIOS, while fetching data.\n', err);
        mailGun(emailList, JSON.stringify(`ERROR: AXIOS, while fetching data.\n ${err}`), true);
    });
}

function mailGun (mailAddress, message, isError) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const newMessage = isError ? message : generateHtml(message);
    const msg = {
        to: mailAddress,
        from: 'amit.kumar5@1mg.com',
        subject: 'Time4Vaccine',
        text: newMessage,
        html: newMessage,
    };
    sgMail
        .send(msg)
        .then(() => {
        console.log('Email sent')
        })
        .catch((error) => {
        console.error('ERROR SGMAIL: ', error)
    });
};

function generateHtml(message) {
    let temp = "";
    message.forEach(item => {
        temp = temp + `<li>${item}</li>`;
    });
    return (`
        <ul style="margin: 0 auto;color: #00ff00;">
            ${temp}
        </ul>
    `);
}