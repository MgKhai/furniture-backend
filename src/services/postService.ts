import { getPost } from "./../controllers/api/postController";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient().$extends({
  result: {
    user: {
      fullName: {
        needs: {
          firstName: true,
          lastName: true,
        },
        compute(user) {
          return `${user.firstName} ${user.lastName}`;
        },
      },
    },
    post: {
      image: {
        needs: {
          image: true,
        },
        compute(post) {
          return "/optimize/" + post.image?.split(".")[0] + ".webp";
        },
      },
      updatedAt: {
        needs: {
          updatedAt: true,
        },
        compute(post) {
          return post.updatedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        },
      },
    },
  },
});

export type PostArgs = {
  title: string;
  content: string;
  body: string;
  image: string;
  authorId: number;
  category: string;
  type: string;
  tags: string[];
};
export const createNewPost = async (postData: PostArgs) => {
  let data: any = {
    title: postData.title,
    content: postData.content,
    body: postData.body,
    image: postData.image,
    author: {
      connect: {
        id: postData.authorId,
      },
    },
    category: {
      connectOrCreate: {
        where: {
          name: postData.category,
        },
        create: {
          name: postData.category,
        },
      },
    },
    type: {
      connectOrCreate: {
        where: {
          name: postData.type,
        },
        create: {
          name: postData.type,
        },
      },
    },
  };

  if (postData.tags && postData.tags.length > 0) {
    data.tags = {
      connectOrCreate: postData.tags.map((tag) => ({
        where: {
          name: tag,
        },
        create: {
          name: tag,
        },
      })),
    };
  }
  return prisma.post.create({
    data,
  });
};

export const getPostById = async (id: number) => {
  return prisma.post.findUnique({
    where: {
      id,
    },
  });
};

export const updatePostById = async (postId: number, postData: PostArgs) => {
  let data: any = {
    title: postData.title,
    content: postData.content,
    body: postData.body,
    category: {
      connectOrCreate: {
        where: {
          name: postData.category,
        },
        create: {
          name: postData.category,
        },
      },
    },
    type: {
      connectOrCreate: {
        where: {
          name: postData.type,
        },
        create: {
          name: postData.type,
        },
      },
    },
  };

  if (postData.image) {
    data.image = postData.image;
  }

  if (postData.tags && postData.tags.length > 0) {
    data.tags = {
      connectOrCreate: postData.tags.map((tag) => ({
        where: {
          name: tag,
        },
        create: {
          name: tag,
        },
      })),
    };
  }

  return prisma.post.update({
    where: {
      id: postId,
    },
    data,
  });
};

export const deletePostById = async (postId: number) => {
  return prisma.post.delete({
    where: {
      id: postId,
    },
  });
};

export const getPostWithRelations = async (id: number) => {
  return prisma.post.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      content: true,
      body: true,
      image: true,
      author: {
        select: {
          fullName: true,
        },
      },
      category: {
        select: {
          name: true,
        },
      },
      type: {
        select: {
          name: true,
        },
      },
      tags: {
        select: {
          name: true,
        },
      },
      updatedAt: true,
    },
  });
};

// offset pagination
export const getPostListsByOffset = async (options: any) => {
  return prisma.post.findMany(options);
};
