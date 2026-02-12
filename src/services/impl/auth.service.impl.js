import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import AuthService from "../auth.service.js";
import userRepository from "../../repositories/user.repository.js";
const SECRET_KEY = process.env.SECRET_KEY || "1245d5s444344345424343";
class AuthServiceImpl extends AuthService {
  async register({ name, email, password }) {
    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      throw new Error("El usuario ya existe");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await userRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    return { message: "Usuario creado correctamente" };
  }

  // async login({ email, password }) {
  //   const user = await userRepository.findByEmail(email);

  //   if (!user) {
  //     throw new Error("Usuario no encontrado");
  //   }

  //   const validPassword = await bcrypt.compare(password, user.password);

  //   if (!validPassword) {
  //     throw new Error("Contraseña incorrecta");
  //   }

  //   const token = jwt.sign(
  //     {
  //       userId: user.id,
  //       role: user.role,
  //     },
  //     SECRET_KEY,
  //     { expiresIn: "1d" }
  //   );

  //   return { token };
  // }
  // async login({ email, password }) {
  //   const user = await userRepository.findByEmail(email);

  //   if (!user) {
  //     throw new Error("Usuario no encontrado");
  //   }

  //   const validPassword = await bcrypt.compare(password, user.password);

  //   if (!validPassword) {
  //     throw new Error("Contraseña incorrecta");
  //   }

  //   // 🔐 Access Token (corta duración)
  //   const accessToken = jwt.sign(
  //     {
  //       userId: user.id,
  //       role: user.role,
  //     },
  //     process.env.ACCESS_SECRET,
  //     { expiresIn: "15m" }, // recomendado
  //   );

  //   // 🔄 Refresh Token (larga duración)
  //   const refreshToken = jwt.sign(
  //     {
  //       userId: user.id,
  //     },
  //     process.env.REFRESH_SECRET,
  //     { expiresIn: "360d" },
  //   );

  //   // Guardar refresh token en BD
  //   await userRepository.updateRefreshToken(user.id, refreshToken);

  //   return {
  //     accessToken,
  //     refreshToken,
  //   };
  // }
  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      throw new Error("Contraseña incorrecta");
    }

    // 🔐 Access token SIN expiración
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      SECRET_KEY,
    );
    // const refreshToken = jwt.sign(
    //   {
    //     userId: user.id,
    //   },
    //   SECRET_KEY,
    //   { expiresIn: "365d" },
    // );

    // await userRepository.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken
    };
  }
}

export default new AuthServiceImpl();
