/**--external--*/
const { omit, isEmpty } = require('lodash');

/**--relative--*/
const mutationResolvers = require("./mutationResolvers");

const resolvers = {
  Query: {
    user: async (root, args, context, info) => {
      const {
        dataSources: { users },
      } = context;

      const { id } = args;

      const { _doc: user } = await users.findOneById(id);

      return user;
    },
    folder: async (root, args, context) => {
      const { id } = args;
      const {
        dataSources: { folders },
      } = context;

      const { _doc: folder } = await folders.findOneById(id);
      return folder;
    },
    link: async (root, args, context) => {
      const { id } = args;
      const {
        dataSources: { links },
      } = context;

      const { _doc: link } = await links.findOneById(id);
      return link;
    },
    node: async (root, args, context, info) => {
      const { input } = args;
      const {
        dataSources: { folders, links, users },
      } = context;

      const { id, type } = input;

      switch (type) {
        case 'USER': {
          const { _doc } = await users.findOneById(id);
          return { ..._doc, type };
        }

        case 'FOLDER': {
          const { _doc } = await folders.findOneById(id);

          return { ..._doc, type };
        }

        case 'LINK': {
          const { _doc } = await links.findOneById(id);
          return { ..._doc, type };
        }

        default: {
          return input;
        }
      }
    },
    multiNode: async (root, args, context) => {
      const {
        input: { ids, type },
      } = args;

      const {
        dataSources: { folders, links, users },
      } = context;

      switch (type) {
        case 'FOLDER': {
          const data = await folders.findManyByIds(ids);
          return data;
        }

        case 'LINK': {
          const data = await links.findManyByIds(ids);
          return data;
        }

        case 'USER': {
          const data = await users.findManyByIds(ids);
          return data;
        }
      }
    },
  },
  Node: {
    __resolveType: (obj, ctx, info) => {
      const { type } = obj;

      switch (type) {
        case 'USER': {
          return 'User';
        }

        case 'FOLDER': {
          return 'Folder';
        }

        case 'LINK': {
          return 'Link';
        }

        default: {
          return null;
        }
      }
    },
  },
  Mutation:mutationResolvers,
  User: {
    id: ({ _id }) => _id,
  },
  Folder: {
    id: ({ _id }) => _id,
  },
  Link: {
    id: ({ _id }) => _id,
  },
};

module.exports = { resolvers };
