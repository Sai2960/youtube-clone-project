exports.checkSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.currentPlan === 'FREE' && user.watchTimeLimit <= 0) {
      return res.status(403).json({ 
        message: 'Watch limit exceeded. Please upgrade.' 
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: 'Subscription check failed' });
  }
};