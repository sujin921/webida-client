/*
 * Copyright (c) 2012-2015 S-Core Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define([
    'webida-lib/webida-0.3',
    'core/deploy',
    'plugin-manager', // pm
    'dojo/parser', // parser
    'dojo/Deferred', // Deferred
    'dijit/registry', // reg
    'dijit/layout/TabContainer', // TabContainer
    'dijit/TitlePane',
    'dijit/layout/ContentPane',
    'toastr',
    'dojo/domReady!'
], function (webida, deploy, pm, parser, Deferred, reg, TabContainer, TitlePane, ContentPane, toastr) {
    'use strict';
    var titlePane = null;
    var oldSelected = null;

    var GET_PROJECT_FAIL_TOASTR = 'Failed to get the project list.';
    var NO_PROJECT_TOASTR = 'No projects in workspace.';

    function cbChangeProject(path) {
        var exts = pm.getExtensions('webida.deploy.workspace:changeproject');
        exts.forEach(function (ext) {
            require([ext.module], function (module) {
                module[ext.changeProjectPath](path);
            });
        });
    }

    function addProject(name, selected) {
        var item = {
            path: null,
            elem: null
        };

        //this.itemList.push(item);
        var path = deploy.getFsidWorkspaceName() + '/' + name;
        item.path = path;
        item.elem = $('<div class="deploy-title-item" id=' + 'prjListItem' + path + '></div>');
        item.elem.attr('title', 'Project name : ' + name);
        item.elem.text(name);
        $('#workspace-list-box').append(item.elem);

        item.elem.bind('mousedown', function () {
            item.elem.addClass('deploy-title-item-pushed');
        });

        item.elem.bind('click', function () {
            if (oldSelected === item.elem) {
                return;
            }
            var exts = pm.getExtensions('webida.deploy.workspace:changeproject');
            var cnt = exts.length;

            function async() {
                var deffered = new Deferred();

                exts.forEach(function (ext) {
                    require([ext.module], function (module) {
                        module[ext.beforeChange](function (ret) {
                            deffered.resolve(ret);
                        });
                    });
                });

                return deffered.promise;
            }

            var checksum = 0;
            var checkres = true;
            async()
            .then(
                function (resolve) {
                    checksum++;
                    if (resolve === false) {
                        checkres = false;
                    }
                    if (checksum === cnt) {
                        if (checkres === true) {
                            if (oldSelected) {
                                oldSelected.removeClass('deploy-title-item-selected');
                            }
                            item.elem.removeClass('deploy-title-item-pushed');
                            cbChangeProject(path);
                            item.elem.addClass('deploy-title-item-selected');
                            oldSelected = item.elem;
                        } else {
                            item.elem.removeClass('deploy-title-item-pushed');
                        }
                    }
                },
                function (err) {
                    toastr.err(err);
                    console.log(err);
                }
            );
        });

        item.elem.bind('mouseup', function () {
            item.elem.removeClass('deploy-title-item-pushed');
        });



        item.elem.bind('mouseover', function () {
            item.elem.addClass('deploy-title-item-hover');
        });

        item.elem.bind('mouseout', function () {
            item.elem.removeClass('deploy-title-item-hover');
            item.elem.removeClass('deploy-title-item-pushed');
            //item.elem.attr('title' , '');
            //item.elem.removeAttr('title');
        });



        if (selected) {
            if (oldSelected) {
                oldSelected.removeClass('deploy-title-item-selected');
            }
            cbChangeProject(path);
            item.elem.addClass('deploy-title-item-selected');
            oldSelected = item.elem;
        }

    }

    function cbGetProject(err, lists) {
        if (err) {
            console.log('failed to get project list.');
            toastr.error(GET_PROJECT_FAIL_TOASTR);
        } else {
            if (!lists || lists.length <= 0) {
                toastr.info(NO_PROJECT_TOASTR);
                return;
            }

            var projectName = deploy.getProjectName();

            lists.sort(function (a, b) {
                if (a.name > b.name) {
                    return 1;
                }

                if (a.name < b.name) {
                    return -1;
                }

                return 0;
            });

            var list;

            for (var i = 0; i < lists.length; i++) {
                list = lists[i];
                if (list.isDirectory === true) {
                    if (list.name[0] !== '.') {
                        if (list.name === projectName) {
                            addProject(list.name, true);
                        } else {
                            addProject(list.name, false);
                        }
                    }
                }
            }
        }
    }

    function init() {
        titlePane = reg.byId('workspace-TitlePane');
        var workspaceName = deploy.getWorkspaceName();
        if (!workspaceName) {
            return;
        }
        var root = deploy.getMount();
        //$('#workspace-list-title').append('<div>'+ workspaceName+'</div>');
        //titlePane.set('title', workspaceName);
        var elem = $('#workspace-list-title');
        elem.text(workspaceName);
        root.list('/' + workspaceName, cbGetProject);
    }


    var workspace = {
        onStart: function () {
            init();
        }
    };

    return workspace;
});
