var express = require('express');
var app = express();
var http = require('http').Server(app);
var Datastore = require('nedb');
var todosDB = new Datastore({filename: 'databases/todos.db', autoload: true});
var io = require('socket.io')(http);

/**
 * @type {Parsers}
 */
var bodyParser = require('body-parser');
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

function Todo(title, content) {
    var t = {};
    t.title = title;
    t.content = content;
    t.status = -1;

    return t;
}

app.get('/all', function (req, res) {
    todosDB.find({}, function (err, todos) {
        res.json(todos);
    });
});

app.post('/insert', function (req, res) {
    var title = req.body.title;
    var content = req.body.content;
    var t = Todo(title, content);

    todosDB.insert(t, function (err, newTodo) {
        if (err) {
            res.json({
                return: false
            });
        } else {
            res.json({
                return: true,
                response: newTodo
            });
        }
    });
});

app.get('/todo/:id', function (req, res) {
    var id = req.params.id;

    todosDB.findOne({_id: id}, function (err, todo) {
        res.json(todo);
    });
});

app.get('/delete/:id', function (req, res) {
    var id = req.params.id;

    todosDB.remove({_id: id}, {}, function (err, numRemoved) {
        if (numRemoved > 0) {
            res.json({
                return: true,
                count: numRemoved
            });
        } else {
            res.json({
                return: false
            });
        }
    });

});

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');

    todosDB.find({}, function (err, todos) {
        io.emit('first_login', todos);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    /**
     * Listen insert To-Do
     */
    socket.on('insert_todo', function (todo) {
        if (todo.title && todo.content) {
            var t = Todo(todo.title, todo.content);
            console.log("Add new: " + t.title);

            todosDB.insert(t, function (err, newTodo) {
                if (err) {
                } else {
                    io.emit('new_todo', newTodo);
                }
            });
        }
    });

    socket.on('delete_todo_', function (id) {
        console.log("Delete: " + id);

        todosDB.remove({_id: id}, {}, function (err, numRemoved) {
            if (numRemoved == 0) {
                io.emit('delete_todo', '-1');
            } else {
                io.emit('delete_todo', id);
            }
        });

    });
});

/**
 * Server Listen
 */
http.listen(5678, function () {
    console.log('listening on localhost:5678');
});