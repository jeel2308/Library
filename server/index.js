/**--external-- */
const { ApolloServer } = require('apollo-server-express');
const { ApolloServerPluginDrainHttpServer } = require('apollo-server-core');
const dotEnv = require('dotenv');
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');

/**--internal-- */
const { resolvers } = require('./resolvers');
const { typeDefs } = require('./schema');
const {
  FolderDataStore,
  LinkDataStore,
  UserDataStore,
} = require('./dataSource');
const initMailTransporter = require('./mailTransporters');

const { userRoutes, pingRoutes } = require('./routes');
const { verifyToken } = require('./middleware');
const { User, Folder, Link } = require('./models');

const app = express();

dotEnv.config();

initMailTransporter();

/**
 * This will allow request from any origin
 */
app.use(
  cors({
    origin: '*',
  })
);

/**
 * This will add JSON payload in as req.body Object
 */
app.use(express.json());

/**
 * This will populate URL encoded payload as req.body Object
 */
app.use(express.urlencoded({ extended: true }));

app.use(userRoutes);

app.use(pingRoutes);

app.use(verifyToken);

/**
 * Instead of using app.listen, we are creating httpServer. httpServer requires a function which
 * handles req and res. Here we are using app for that purpose.
 * So, when request arrives control will flow in this way:
 * httpServer -> app -> middleware ->apollo server
 */
const httpServer = http.createServer(app);

const { PASSWORD, DB } = process.env;

const DB_URL = `mongodb+srv://Jeel2308:${PASSWORD}@cluster0.erkx1.mongodb.net/${DB}?retryWrites=true&w=majority`;

const startServer = async () => {
  try {
    await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Mongodb connected');

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      dataSources: () => {
        return {
          users: new UserDataStore(User),
          folders: new FolderDataStore(Folder),
          links: new LinkDataStore(Link),
        };
      },
      context: ({ req }) => {
        return {
          user: req.user,
        };
      },
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });

    await server.start();

    console.log('Apollo server started');

    /**
     * Connects Apollo Server with middleware based library.
     * Basically server will be treated as middleware
     */
    server.applyMiddleware({ app });

    await httpServer.listen({ port: 4000 });
    console.log('Express server started');
  } catch (e) {
    console.log(e);
  }
};

startServer();
