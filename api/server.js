const express = require('express'),
      bodyParser = require('body-parser'),
      multiparty = require('connect-multiparty'),
      mongodb = require('mongodb'),
      objectId = require('mongodb').ObjectId,
      fs = require('fs')

const app = express()

//body-parser
app.use(bodyParser.urlencoded({ extended: true}))
app.use(bodyParser.json())
app.use(multiparty()) //reconhecer formularios do tipo multipart/form-data

//resolvendo preflight
app.use((req, res, next) => {

    res.setHeader("Access-Control-Allow-Origin", "*")   //cross-domain
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")  //quais metodos origem pode requisitar (get, post, put, delete) 
    res.setHeader("Access-Control-Allow-Headers", "content-type")  //requisicao com cabeçalhos reescritos podem ser efetuadas - passagem do comentario no body
    res.setHeader("Access-Control-Allow-Credentials", true) //

    next()
})

const port = 8080

app.listen(port)

console.log('servidor http está escutando a porta ' + port)

const db = new mongodb.Db(
    'instagram',
    new mongodb.Server('localhost', 27017, {}),
    {}
)

app.get('/', (req, res) => {
    res.send({msg: 'olá tudo bem?'})
})

//URI + VERB HTTP
app.post('/api', (req, res) => {

    //res.setHeader("Access-Control-Allow-Origin", "http://localhost:80")
//    res.setHeader("Access-Control-Allow-Origin", "*")

    //const dados = req.body
    //res.send(dados)
    const date = new Date()
    const time_stamp = date.getTime()

    const path_origem = req.files.arquivo.path
    const path_destino = './uploads/' + time_stamp + "_" + req.files.arquivo.originalFilename

    const url_imagem = time_stamp + "_" + req.files.arquivo.originalFilename

    fs.rename(path_origem, path_destino, (err)=>{
        if (err){
            res.status(500).json({error: err})
            return
        }

        const dados = {
            url_imagem: url_imagem,
            titulo: req.body.titulo
        }

        db.open( (err, mongoclient) => {
            mongoclient.collection("postagens", (err, collection) => {
                collection.insert(dados, (err, records) => {
                    if (err)
                        res.json(err)
                    else
                        res.json(records)

                    mongoclient.close()
                })
            })
        })

    })
})

app.get('/api', (req, res) => {
    
    //res.setHeader("Access-Control-Allow-Origin", "*")

    const dados = req.body

    db.open( (err, mongoclient) => {
        mongoclient.collection("postagens", (err, collection) => {
            collection.find().toArray((err, result)=> {
                if (err)
                    res.json(err)
                else
                    res.json(result)
            })

            mongoclient.close()
        })
    })
})

app.get('/api/:id', (req, res) => {

    const dados = req.body

    db.open( (err, mongoclient) => {
        mongoclient.collection("postagens", (err, collection) => {
            collection.find(objectId(req.params.id)).toArray((err, result)=> {
                if (err)
                    res.json(err)
                else
                    res.status(200).json(result)
            })

            mongoclient.close()
        })
    })
})

app.get('/imagens/:imagem', (req, res) => {
    const img = req.params.imagem
    
    fs.readFile('./uploads/' + img, (err, content) => {
        if (err){
            res.status(400).json(err)
            return
        }

        res.writeHead(200, {'content-type' : 'image/jpg'})
        res.end(content)
    })
})

app.put('/api/:id', (req, res) => {

    //const dados = req.body
    //res.send(req.params.id)
    //res.send(req.body.comentario)

    db.open( (err, mongoclient) => {
        mongoclient.collection("postagens", (err, collection) => {
            collection.update(
                {_id : objectId(req.params.id)},
                // { $set: { titulo: req.body.titulo, 
                //           foto: req.body.foto }
                // },
                { $push: 
                    { 
                        comentarios: {
                                        id_comentario: new objectId(),
                                        comentario: req.body.comentario
                        }
                    }
                },
                {},
                (err, records) => {
                    if (err)
                        res.json(err)
                    else
                        res.json(records)

                    mongoclient.close()
                }
            )
        })
    })
})

app.delete('/api/:id', (req, res) => {
    // db.open( (err, mongoclient) => {
    //     mongoclient.collection("postagens", (err, collection) => {
    //         collection.remove({ _id : objectId(req.params.id)}, (err, result)=> {
    //             if (err)
    //                 res.json(err)
    //             else
    //                 res.json(result)

    //             mongoclient.close()
    //         })
    //     })
    // })
    db.open( (err, mongoclient) => {
        mongoclient.collection("postagens", (err, collection) => {
                collection.update(
                    { }, 
                    { $pull: 
                        {
                            comentarios: { id_comentario: objectId(req.params.id) }
                        } 
                    },
                    {multi: true},
                    (err, result)=> {
                    if (err)
                        res.json(err)
                    else
                        res.json(result)
                        
                    mongoclient.close()                        
            })
        })
    })    
})