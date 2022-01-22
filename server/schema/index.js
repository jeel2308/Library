const typeDefs = `

  interface Node{
      id:ID!
  }

  type User implements Node{
      id: ID!
      name: String!
      email: String!
      folders:[Folder!]
  }
  
  type Link implements Node{
      id:ID!
      url: String!
      isCompleted: Boolean!
  }
  
  type Folder implements Node{
      id: ID!
      name: String!
      links: [Link!]
  }

  enum NodeType{
      USER
      FOLDER
      LINK
  }

  enum MultiNodeType{
      USER
      FOLDER
      LINK
  }

  input NodeInput{
      id: ID!
      type: NodeType!
  }

  input MultiNodeInput{
      ids:[ID!]!
      type: MultiNodeType!
  }

  type Query{
      user(id:ID!):User!
      folder(id:ID!):Folder!
      link(id:ID!):Link!
      node(input:NodeInput!):Node
      multiNode(input:MultiNodeInput!):[Node]!
  }

  input AddFolderInput{
      name: String!
  }

  input UpdateFolderInput{
      id:ID!
      name: String
      userId: String
  }

  input DeleteFolderInput{
      id:ID!
  } 

  input AddLinkInput{
      url:String!
      folderId: ID!
      isCompleted:Boolean
  }

  input UpdateLinkInput{
      url: String
      folderId:ID
      isCompleted:Boolean
      id: ID! 
  }

  input DeleteLinkInput{
      id:ID!
  }

  type FolderMutations{
     addFolder(input:AddFolderInput!):Folder!
     updateFolder(input:UpdateFolderInput!):Folder!
     deleteFolder(input:DeleteFolderInput!):Folder!
  }

  type LinkMutations{
      addLink(input:AddLinkInput!):Link!
      updateLink(input:UpdateLinkInput!):Link!
      deleteLink(input:DeleteLinkInput!):Link!
  }

  type Mutation{
      linkManagement: LinkMutations!
      folderManagement: FolderMutations!
  }
`;

module.exports = { typeDefs };
