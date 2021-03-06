const express    = require('express');
const bodyParser = require('body-parser');
const db         = require('../database/cassandra.js');
const poll       = require('../queue/getAnalyticsQueue');
const format     = require('../parser/parse.js');
const mongo      = require('../database/mongo.js');
const couch      = require('../database/couch.js');

const router = express.Router();

/* =============
== MIDDLEWARE ==
============= */
router.use(bodyParser());

/* =====================
== CLIENT SIDE ROUTES ==
===================== */
router.get('/', (req, res) => res.send('hello world!'));


/* =========================
== POLL FROM EVENTS QUEUE == 
==========================*/
router.get('/queue/analytics', async (req, res) => {
    // get messages from analytics queue
    poll.getMessages()
    // Parse the data
    .then(result => {
        console.log(result);
        let formattedData;
        let objKeys = Object.keys(result[0]);
        if (objKeys.length === 3) formattedData = format.listings(result[0]); // listings
        else if (objKeys.includes('qty')) formattedData = format.orders(result[0]); // orders
        else if (objKeys.includes('cart')) formattedData = format.client(result[0]); // client
        return formattedData;
    })
    // insert into cassandra database
    // Need to configure on how to deal with polling more messages and handling multiple messages rather than 1
    .then(formattedData => {
        console.log('data formatted: ', formattedData);
        if (formattedData.length > 1) {
            // need to handle bigger data
            console.log(formattedData);
        } else {
            db.insertIntoEventsByUserId(formattedData);
            db.insertIntoEventsByProductId(formattedData);
        }

        res.json('insert success');
        return 'inserted success!';
    })
    .catch(err => res.json(err));
});

/* ===================
== GET DATA FROM DB ==
====================*/
router.get('/database/weekly', (req, res) => {
    var start = new Date();

    db.selectEventsByCurrentWeek()
    .then(result => {
        console.log(result.rows.length)
        res.json(result.rows)
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms | get weekly items');
    })
    .catch(err => console.log(err));
})

router.get('/mongo/weekly', (req, res) => {
    var start = new Date();

    mongo.findAll((err, result) => {
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms');
        return res.status(200).json(result);
    });
});

router.get('/couch/weekly', (req, res) => {
    var start = new Date();
    console.log('here');

    couch.findAll((err, result) => {
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms');
        return res.status(200).json(result);
    });
});

router.get('/queue/filtering/:start_date/:end_date', (req, res) => {
    var start = new Date();
    /* params: year - month - day */
    var startDate = req.params.start_date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") + ' 00:00:00+0200';
    var endDate = req.params.end_date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") + ' 00:00:00+0200';

    db.selectEventsByCurrentWeekCustom(startDate, endDate)
    .then(result => {
        console.log(result);
        res.json(result.rows);
    })
    .then(end => {
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms | get weekly items custommized');
    })
    .catch(err => console.log("Err", err));
});

/* ==========================
== POST TO FILTERING QUEUE == 
===========================*/

/* Select All */
router.get('/database/users', (req, res) => {
    var start = new Date();
    var getAllUsers = db.selectAllUsers();
    getAllUsers.then(result => {
        res.json(result.rows)
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms | All Users');
    }).catch(err => console.log("Err", err));
});

router.get('/database/analytics/product', (req, res) => {
    var start = new Date();
    var getAllAnalytics = db.selectAllByProductId();
    getAllAnalytics.then(result => {
        res.json(result.rows)
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms | All Analytics by Product Id');
    }).catch(err => console.log("Err", err));
});

router.get('/database/analytics/user', (req, res) => {
    var start = new Date();
    var getAllAnalytics = db.selectAllByUserId();
    getAllAnalytics.then(result => {
        res.json(result.rows)
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms | All Analytics by User');
    }).catch(err => console.log("Err", err));
});

router.get('/database/analytics/time', (req, res) => {
    var start = new Date();
    var getAllAnalytics = db.selectAllByTime();
    getAllAnalytics.then(result => {
        res.json(result.rows)
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms | All Analytics by Time');
    }).catch(err => console.log("Err", err));
});

/* == Select Specific == */
router.get('/database/users/:userId', (req, res) => {
    var start = new Date();
    var userId = req.params.userId;
    var selectByUserId = db.selectUserByUserId(userId);
    selectByUserId.then(result => {
        res.json(result.rows);
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms');
    }).catch(err => console.log("Err", err));
});

router.get('/database/analytics/product/:productId', (req, res) => {
    var start = new Date();
    var productId = req.params.productId;
    var selectByProductId = db.selectEventsByProductId(productId);
    selectByProductId.then(result => {
        res.json(result.rows);
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms');
    }).catch(err => console.log("Err", err));
});

router.get('/database/analytics/user/:userId', (req, res) => {
    var start = new Date();
    var userId = req.params.userId;
    var selectByUserId = db.selectEventsByUserId(userId);
    selectByUserId.then(result => {
        res.json(result.rows);
        var elapsed = new Date() - start;
        console.log(elapsed + ' ms');
    }).catch(err => console.log("Err", err));
});

module.exports = router;
