"use strict";

var webpack = require("webpack");
var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var dts = require("dts-bundle");
var rimraf = require("rimraf");
var GenerateJsonPlugin = require("generate-json-webpack-plugin");
var packageJson = require("./package.json");
var fs = require("fs");

var banner = [
    "surveyjs Editor v" + packageJson.version,
    "(c) Devsoft Baltic O� - http://surveyjs.io/",
    "Github - https://github.com/surveyjs/editor",
    "License: (http://editor.surveyjs.io/license.html)"
].join("\n");

var dts_banner = [
    "Type definitions for Surveyjs Editor JavaScript library v" +
    packageJson.version,
    "(c) Devsoft Baltic O� - http://surveyjs.io/",
    "Github - https://github.com/surveyjs/editor",
    "License: (http://editor.surveyjs.io/license.html)",
    ""
].join("\n");

var packagePlatformJson = {
    name: "surveyjs-editor",
    version: packageJson.version,
    description: "Use surveyjs Editor to create or edit JSON for surveyjs library.",
    keywords: ["Survey", "JavaScript", "Editor", "surveyjs"],
    homepage: "http://editor.surveyjs.io",
    license: "http://editor.surveyjs.io/license.html",
    files: [
        "surveyeditor.css",
        "surveyeditor.js",
        "surveyeditor.d.ts",
        "surveyeditor.min.js"
    ],
    main: "surveyeditor.js",
    repository: {
        type: "git",
        url: "https://github.com/surveyjs/editor.git"
    },
    engines: {
        node: ">=0.10.0"
    },
    typings: "surveyeditor.d.ts",
    dependencies: {
        "survey-knockout": "^" + packageJson.version,
        knockout: "^3.4.0",
        bootstrap: "^3.3.6",
        "ace-builds": "^1.2.2",
        "@types/knockout": "^3.4.0"
    },
    devDependencies: {}
};

module.exports = function(options) {
    var packagePath = "./package/";
    var extractCSS = new ExtractTextPlugin({
        filename: packagePath + "surveyeditor.css"
    });

    var percentage_handler = function handler(percentage, msg) {
        if (0 == percentage) {
            console.log("Build started... good luck!");
        } else if (1 == percentage) {
            if (options.buildType === "prod") {
                dts.bundle({
                    name: "../../surveyeditor",
                    main: packagePath + "typings/entries/index.d.ts",
                    outputAsModuleFolder: true,
                    headerText: dts_banner
                });
                rimraf.sync(packagePath + "typings");
                fs
                    .createReadStream("./npmREADME.md")
                    .pipe(fs.createWriteStream(packagePath + "README.md"));
            }
        }
    };

    var config = {
        entry: {
            surveyeditor: path.resolve(__dirname, "./src/entries/index.ts")
        },
        resolve: {
            extensions: [".ts", ".tsx", ".scss"],
            alias: {
                tslib: path.join(__dirname, "./src/entries/helpers.ts")
            }
        },
        module: {
            rules: [{
                    test: /\.(ts|tsx)$/,
                    loader: "ts-loader",
                    options: {
                        compilerOptions: {
                            declaration: options.buildType === "prod",
                            outDir: packagePath + "typings/"
                        }
                    }
                },
                {
                    test: /\.scss$/,
                    loader: extractCSS.extract({
                        fallbackLoader: "style-loader",
                        loader: "css-loader!sass-loader"
                    })
                },
                {
                    test: /\.html$/,
                    loader: "html-loader"
                },
                {
                    test: /\.svg/,
                    use: {
                        loader: "url-loader",
                        options: {}
                    }
                }
            ]
        },
        output: {
            filename: packagePath +
                "[name]" +
                (options.buildType === "prod" ? ".min" : "") +
                ".js",
            library: "SurveyEditor",
            libraryTarget: "umd",
            umdNamedDefine: true
        },
        externals: {
            knockout: {
                root: "ko",
                commonjs2: "knockout",
                commonjs: "knockout",
                amd: "knockout"
            },
            "survey-knockout": {
                root: "Survey",
                commonjs2: "survey-knockout",
                commonjs: "survey-knockout",
                amd: "survey-knockout"
            }
        },
        plugins: [
            new webpack.ProgressPlugin(percentage_handler),
            new webpack.DefinePlugin({
                "process.env.ENVIRONMENT": JSON.stringify(options.buildType),
                "process.env.VERSION": JSON.stringify(packageJson.version)
            }),
            // new webpack.HotModuleReplacementPlugin(),
            extractCSS
        ],
        devtool: "inline-source-map"
    };

    if (options.buildType === "prod") {
        config.devtool = false;
        config.plugins = config.plugins.concat([
            new webpack.optimize.UglifyJsPlugin(),
            new webpack.BannerPlugin(banner),
            new GenerateJsonPlugin(
                packagePath + "package.json",
                packagePlatformJson,
                undefined,
                2
            )
        ]);
    }

    if (options.buildType === "dev") {
        config.plugins = config.plugins.concat([
            new webpack.LoaderOptionsPlugin({ debug: true })
        ]);
    }

    return config;
};