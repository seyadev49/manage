const db = require('../db/connection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed for receipts'));
    }
  }
});

const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = [
      {
        id: 'basic',
        name: 'Basic Plan',
        price: 600,
        price_yearly: 6480,
        interval: 'month',
        limits: {
          properties: 3,
          tenants: 25,
          documents: 100,
          maintenance_requests: 50
        },
        features: [
          'Up to 3 properties',
          'Up to 25 tenants',
          'Basic payment tracking',
          'Email support',
          'Document storage (100 files)',
          'Basic maintenance tracking'
        ]
      },
      {
        id: 'professional',
        name: 'Professional Plan',
        price: 2000,
        price_yearly: 21600,
        interval: 'month',
        limits: {
          properties: 10,
          tenants: 100,
          documents: 500,
          maintenance_requests: 200
        },
        features: [
          'Up to 10 properties',
          'Up to 100 tenants',
          'Advanced payment tracking',
          'Maintenance management',
          'Document storage (500 files)',
          'Priority support',
          'Advanced reporting'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise Plan',
        price: 5000,
        price_yearly: 51000,
        interval: 'month',
        limits: {
          properties: -1, // unlimited
          tenants: -1, // unlimited
          documents: -1, // unlimited
          maintenance_requests: -1 // unlimited
        },
        features: [
          'Unlimited properties',
          'Unlimited tenants',
          'Full feature access',
          'Dedicated support',
          'Custom reporting',
          'Advanced reporting',
          'Unlimited document storage',
          '24/7 phone support',
          // 'Custom integrations'
        ]
      }
    ];

    res.json({ plans });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const upgradeSubscription = async (req, res) => {
  try {
    const { planId, paymentMethod, billingCycle = 'monthly' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Payment receipt is required' });
    }

    const plans = [
      { id: 'basic', name: 'Basic Plan', price: 29.99, interval: 'month', limits: { properties: 3, tenants: 50, documents: 100, maintenance_requests: 50 } },
      { id: 'professional', name: 'Professional Plan', price: 59.99, interval: 'month', limits: { properties: 20, tenants: 200, documents: 500, maintenance_requests: 200 } },
      { id: 'enterprise', name: 'Enterprise Plan', price: 99.99, interval: 'month', limits: { properties: -1, tenants: -1, documents: -1, maintenance_requests: -1 } }
    ];

    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    // Calculate price based on billing cycle
    let price = selectedPlan.price;
    if (billingCycle === 'annual') {
      price = selectedPlan.price * 10; // 10 months price for 12 months (2 months free)
    }

    // Calculate next renewal date
    const currentDate = new Date();
    let nextRenewalDate = new Date(currentDate);

    switch (billingCycle) {
      case 'monthly':
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
        break;
      case 'annual':
        nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
        break;
      case 'semi-annual':
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 6);
        break;
    }

    // Ensure date is in MySQL format
    const mysqlDate = nextRenewalDate.toISOString().split('T')[0];

    // Update organization subscription
    // Set status to 'pending_verification' until receipt is verified
    await db.execute(
      `UPDATE organizations 
       SET subscription_status = 'pending_verification', 
           subscription_plan = ?,
           subscription_price = ?,
           billing_cycle = ?,
           next_renewal_date = ?,
           trial_end_date = ?
       WHERE id = ?`,
      [planId, price, billingCycle, mysqlDate, mysqlDate, req.user.organization_id]
    );

    // Insert subscription history record
    await db.execute(
      `INSERT INTO subscription_history (organization_id, plan_id, amount, payment_method, billing_cycle, status, start_date, end_date, receipt_path) 
       VALUES (?, ?, ?, ?, ?, 'pending_verification', CURDATE(), ?, ?)`,
      [req.user.organization_id, planId, price, paymentMethod, billingCycle, mysqlDate, req.file.path]
    );

    res.json({
      message: 'Subscription upgrade request submitted successfully. We will verify your payment and activate your plan within 24 hours.',
      plan: planId,
      amount: price,
      billingCycle,
      nextRenewalDate: mysqlDate
    });

  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const renewSubscription = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Payment receipt is required' });
    }

    // Get current subscription details
    const [organizations] = await db.execute(
      `SELECT subscription_plan, subscription_price, billing_cycle, next_renewal_date 
       FROM organizations WHERE id = ?`,
      [req.user.organization_id]
    );

    if (organizations.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const org = organizations[0];
    
    // Calculate next renewal date
    const currentRenewalDate = new Date(org.next_renewal_date);
    let nextRenewalDate = new Date(currentRenewalDate);
    
    switch (org.billing_cycle) {
      case 'monthly':
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
        break;
      case 'semi-annual':
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 6);
        break;
      case 'annual':
        nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
        break;
    }

    // Update organization subscription status
    // Set status to 'pending_verification' until receipt is verified
    await db.execute(
      `UPDATE organizations 
       SET subscription_status = 'pending_verification',
           next_renewal_date = ?,
           overdue_since = NULL
       WHERE id = ?`,
      [nextRenewalDate, req.user.organization_id]
    );

    // Create renewal record
    await db.execute(
      `INSERT INTO subscription_history (organization_id, plan_id, amount, payment_method, billing_cycle, status, start_date, end_date, receipt_path) 
       VALUES (?, ?, ?, ?, ?, 'pending_verification', CURDATE(), ?, ?)`,
      [req.user.organization_id, org.subscription_plan, org.subscription_price, paymentMethod, org.billing_cycle, nextRenewalDate, req.file.path]
    );

    res.json({
      message: 'Subscription renewal request submitted successfully. We will verify your payment and extend your subscription within 24 hours.',
      nextRenewalDate
    });
  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSubscriptionStatus = async (req, res) => {
  try {
    const [organizations] = await db.execute(
      `SELECT subscription_status, subscription_plan, subscription_price, billing_cycle,
              next_renewal_date, trial_end_date, overdue_since
       FROM organizations WHERE id = ?`,
      [req.user.organization_id]
    );

    if (organizations.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const subscription = organizations[0];

    // Calculate days until renewal
    let daysUntilRenewal = null;
    if (subscription.subscription_status.toLowerCase() === 'trial' && subscription.trial_end_date) {
      const today = new Date();
      const trialEndDate = new Date(subscription.trial_end_date);
      daysUntilRenewal = Math.ceil((trialEndDate - today) / (1000 * 60 * 60 * 24));
    } else if (subscription.next_renewal_date) {
      const today = new Date();
      const renewalDate = new Date(subscription.next_renewal_date);
      daysUntilRenewal = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));
    }

    // Check if already renewed (has pending_verification status)
    const [pendingRenewals] = await db.execute(
      `SELECT COUNT(*) as count FROM subscription_history
       WHERE organization_id = ?
       AND status = 'pending_verification'
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [req.user.organization_id]
    );

    const alreadyRenewed = pendingRenewals[0].count > 0;

    res.json({
      subscription: {
        ...subscription,
        daysUntilRenewal,
        alreadyRenewed
      }
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkPlanLimits = async (req, res) => {
  try {
    const { feature } = req.params;   
    
    // Get current subscription
    const [organizations] = await db.execute(
      `SELECT subscription_plan, subscription_status FROM organizations WHERE id = ?`,
      [req.user.organization_id]
    );

    if (organizations.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const org = organizations[0];
    
    // Check if subscription is suspended or cancelled
    if (org.subscription_status === 'suspended' || org.subscription_status === 'cancelled') {
      return res.status(403).json({ 
        message: 'Subscription required',
        canAccess: false,
        reason: 'inactive_subscription'
      });
    }

    // Plan limits
    const planLimits = {
      basic: { properties: 3, tenants: 50, documents: 100, maintenance_requests: 50 },
      professional: { properties: 20, tenants: 200, documents: 500, maintenance_requests: 200 },
      enterprise: { properties: -1, tenants: -1, documents: -1, maintenance_requests: -1 }
    };

    // For expired trial or overdue, use basic plan limits
    let currentPlan = org.subscription_plan || 'basic';
    if (org.subscription_status === 'expired_trial' || org.subscription_status === 'overdue') {
      currentPlan = 'basic';
    }

    const limit = planLimits[currentPlan][feature];

    // Get current usage based on feature
    let countQuery;
    switch (feature) {
      case 'properties':
        countQuery = 'SELECT COUNT(*) as count FROM properties WHERE organization_id = ? AND is_active = TRUE';
        break;
      case 'tenants':
        countQuery = 'SELECT COUNT(*) as count FROM tenants WHERE organization_id = ? AND is_active = TRUE';
        break;
      case 'documents':
        countQuery = 'SELECT COUNT(*) as count FROM documents WHERE organization_id = ? AND is_active = TRUE';
        break;
      case 'maintenance_requests':
        countQuery = 'SELECT COUNT(*) as count FROM maintenance_requests WHERE organization_id = ?';
        break;
      default:
        return res.json({ canAccess: true, currentUsage: 0, limit, plan: currentPlan });
    }

    const [result] = await db.execute(countQuery, [req.user.organization_id]);
    const currentUsage = result[0].count;

    res.json({
      canAccess: currentUsage < limit || limit === -1,
      currentUsage,
      limit: limit === -1 ? 'unlimited' : limit,
      plan: currentPlan,
      feature
    });
  } catch (error) {
    console.error('Check plan limits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getSubscriptionPlans,
  upload,
  upgradeSubscription,
  renewSubscription,
  getSubscriptionStatus,
  checkPlanLimits
};