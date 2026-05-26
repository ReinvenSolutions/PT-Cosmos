import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { getLoginBlockMessage } from "./utils/userAccess";

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.findUserByUsername(username);
      
      if (!user) {
        return done(null, false, { message: "Usuario o contraseña incorrectos" });
      }

      const blockMessage = getLoginBlockMessage(user);
      if (blockMessage) {
        return done(null, false, { message: blockMessage });
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
    if (!user || getLoginBlockMessage(user)) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
