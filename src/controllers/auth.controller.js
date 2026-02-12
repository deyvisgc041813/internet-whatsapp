import authService from "../services/impl/auth.service.impl.js";

class AuthController {
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const result = await authService.login(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

export default new AuthController();
