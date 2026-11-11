const { signToken } = require("../src/utils/jwt");

function generateUniqueUser(context, events, done) {
  const userId = `load-student-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  context.vars.userId = userId;
  context.vars.token = signToken({
    id: userId,
    email: `${userId}@studyspace.test`,
    role: "student",
  });

  return done();
}

module.exports = { generateUniqueUser };
