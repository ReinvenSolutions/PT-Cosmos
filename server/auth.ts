import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.findUserByUsername(username);
      
      if (!user) {
        return done(null, false, { message: "Usuario o contraseña incorrectos" });
      }

      if (!user.isActive) {
        return done(null, false, { message: "Tu cuenta ha sido desactivada. Contacta al administrador." });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValidPassword) {
        return done(null, false, { message: "Usuario o contraseña incorrectos" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
