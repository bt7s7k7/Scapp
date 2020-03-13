import Vue from 'vue'
import VueRouter, { RouteConfig } from 'vue-router'
import Home from '../views/Home.vue'
import { auth } from "../firebase"

Vue.use(VueRouter)

const routes = [
    {
        name: "Home",
        path: "/",
        component: Home
    }, {
        name: "Login",
        path: "/login",
        component: () => import( /* webpackChunkName: "login" */ "../views/Login.vue")
    }
] as RouteConfig[]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

export default router
