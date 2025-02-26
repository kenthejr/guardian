import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IUser, UserRole } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { DemoService } from 'src/app/services/demo.service';
import { HeaderPropsService } from 'src/app/services/header-props.service';
import { AuthService } from '../../services/auth.service';

/**
 * Header and Navigation
 */
@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
    links: any = null;
    activeLink: string = "";
    activeLinkRoot: string = "";
    role: any = null;
    isLogin: boolean = false;
    username: string | null = null;
    linksConfig: any = {
        default: null
    };
    commonLinksDisabled: boolean = false; 

    menuIcon: 'expand_more' | 'account_circle' = 'expand_more';
    testUsers$: Observable<any[]>;

    constructor(
        public authState: AuthStateService,
        private auth: AuthService,
        private otherService: DemoService,
        private route: ActivatedRoute,
        private router: Router,
        public dialog: MatDialog,
        private headerProps: HeaderPropsService
    ) {
        this.testUsers$ = this.otherService.getAllUsers();

        this.linksConfig[UserRole.USER] = [{
            name: "Profile",
            disabled: false,
            link: '/user-profile'
        }, {
            name: "Policies",
            disabled: false,
            link: '/policy-viewer'
        }];
        this.linksConfig[UserRole.STANDARD_REGISTRY] = [{
            name: "Profile",
            disabled: false,
            link: '/config'
        }, {
            name: "Schemas",
            disabled: false,
            link: '/schemas'
        }, {
            name: "Tokens",
            disabled: false,
            link: '/tokens'
        }, {
            name: "Policies",
            disabled: false,
            link: '/policy-viewer'
        }, {
            name: "Policies configuration",
            disabled: false,
            link: '/policy-configuration',
            hidden: true,
        },
        {
            name: "Admin",
            disabled: false,
            link: '/admin/settings',
            links: [
                '/admin/settings',
                '/admin/logs',
                '/admin/status'
            ]
        }];
        this.linksConfig[UserRole.AUDITOR] = [{
            name: "Audit",
            disabled: false,
            link: '/audit'
        }, {
            name: "Trust Chain",
            disabled: false,
            link: '/trust-chain'
        }];

        this.links = this.linksConfig.default;
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.update();
            }
        })
        headerProps.isLoading$.subscribe(value => this.commonLinksDisabled = value);
    }

    ngOnInit() {
        this.activeLink = "";
        this.update();
    }

    async update() {
        if (this.activeLink == this.router.url) {
            return;
        }
        this.activeLink = this.router.url;
        this.activeLinkRoot = this.router.url.split('?')[0];
        this.auth.sessions().subscribe((user: IUser | null) => {
            const isLogin = !!user;
            const role = user ? user.role : null;
            const username = user ? user.username : null;
            this.setStatus(isLogin, role, username);
            this.authState.updateState(isLogin);
        }, () => {
            this.setStatus(false, null, null);
        });
    }

    setStatus(isLogin: boolean, role: any, username: any) {
        if (this.isLogin != isLogin || this.role != role) {
            this.isLogin = isLogin;
            this.role = role;
            this.username = username;

            this.menuIcon = this.isLogin ? 'account_circle' : 'expand_more';

            if (this.isLogin) {
                this.links = this.linksConfig[this.role];
            } else {
                this.links = this.linksConfig.default;
            }
        }
    }

    logIn() {
        this.router.navigate(['/login']);
    }

    profile() {
        this.router.navigate(['/user-profile']);
    }

    logOut() {
        this.auth.removeAccessToken();
        this.auth.removeUsername();
        this.authState.updateState(false);
        this.router.navigate(['/login']);
    }

    rout(link: any) {
        this.router.navigate([link.link]);
    }

    isActive(link: any) {
        if (link.links) {
            return link.links.indexOf(this.activeLink) !== -1;
        }
        return this.activeLink == link.link || this.activeLinkRoot == link.link;
    }

    isHidden(link: any) {
        return link.hidden && !this.isActive(link);
    }

    onHome() {
        this.router.navigate(['/']);
    }

    getPoliciesRolesLength(policyRoles: any) {
        return policyRoles.length;
    }

    getPoliciesRolesTooltip(policyRoles: any) {
        return policyRoles.map((item: any) => {
            return `${item.name} (${item.version}): ${item.role}`
        }).join('\r\n');
    }
}
