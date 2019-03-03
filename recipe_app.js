// initialize express and middleware
let path = require('path');
let express = require('express');
let request = require('request');
let bodyParser = require('body-parser');
let app = express();

app.use(bodyParser.urlencoded({extended: false}));

// set up request stuff
// this would need to be moved to a separate file (encrypted maybe so other
//   people can't see it). need to learn more about this...
let f2fapi = '2ccd0a822b7122a6c6ddb5dc1bd146ea';

// this could be unnecessary, look into
let headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
};

let options = {
    url: 'https://www.food2fork.com/api/search?key=' + f2fapi,
    method: 'GET',
    headers: headers,
    qs: {'q': 'tasty'}  // how can i allow this to be updated by a user search query?
};

// set up session stuff
let session = require('express-session');
// i need to see a legitimate implementation of this to understand it better...
app.use(session({secret:'dontreadthissecretpassword'}));

// set up handlebars stuff
let handlebars = require('express-handlebars').create({defaultLayout:'main'});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', 3000);

// create path to project assets
// afaik this sets up a virtual filesystem that can really make things less brittle,
//   as we won't have hard file paths all over the place
let dir = path.join(__dirname, 'public/');
app.use(express.static(dir));

// project pages
app.get('/', function(req,res) {
    res.render('splash');
});

// super duper hacky way to get data from get request into app.post so it
//   doesn't just dissapear when the form is used. I will be looking into
//   proper ways to handle this!
let globalContext = {};

app.get('/preqs', function(req, res) {
        // GET using 'request' middleware
        request(options, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                let json = JSON.parse(body);
                //console.log(json);
                let context = {};
                context.bodyCount = 0;
                context.bodyParams = [];

                for (let entry in json.recipes) {
                    //console.log(json.recipes[entry].title);
                    context.bodyCount++;
                    context.bodyParams.push({'key': entry, 'value': json.recipes[entry].title});
                }
                // session
                context.name = req.session.name;
                context.addRecipe = req.session.addRecipe || [];
                //console.log(context.addRecipe);

                globalContext.bodyCount = context.bodyCount;
                globalContext.bodyParams = context.bodyParams;

                res.render('preqs', context); 
            }
            // else it would probably be wise to do some error handling...
        });
});

app.post('/preqs', function(req, res) {
    let context = {};

    // very hacky way to only do this once (I don't care about creating an actual unique
    //   session, was just trying to see if I could get this all to work!)
    if (!req.session.name) {
        req.session.name = req.body.name;
        req.session.addRecipe = [];
        req.session.curId = 0;
    }

    if(req.body['Add Recipe']) {
        req.session.addRecipe.push({"name": req.body.name, "id": req.session.curId});
        req.session.curId++;
    }

    context.name = req.session.name;
    context.addRecipe = req.session.addRecipe;
    context.bodyCount = globalContext.bodyCount;
    context.bodyParams = globalContext.bodyParams;
    //console.log(context.bodyParams);
    res.render('preqs', context);
});

app.get('/toc', function(req, res) {
    res.render('toc');
});

app.get('/links', function(req, res) {
    res.render('links');
});

// my ultimate goal is to make this way smarter, it is probably
//   going to take way more time than I have for this class though...
app.get('/kartoffelkuchen', function(req, res) {
    // my virtual path doesn't seem to help me here :/
    let context = require('./public/kartoffelkuchen.json');
    //console.log(context);
    res.render('recipe', context);
});

app.get('/mug_cake', function(req, res) {
    let context = require('./public/mug_cake.json');
    //console.log(context);
    res.render('recipe', context);
});

// error handling
app.use(function(req,res) {
    res.status(404);
    res.render('404');
});

app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.type('plain/text');
    res.status(500);
    res.render('500');
});

// notifications
app.listen(app.get('port'), function() {
    console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});

