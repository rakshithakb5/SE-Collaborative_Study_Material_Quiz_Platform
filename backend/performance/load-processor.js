
function generateUniqueUser(context, events, done) {
    context.vars.userId =
      `load-student-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
    return done();
  }
  
  module.exports = {
    generateUniqueUser,
  };
  