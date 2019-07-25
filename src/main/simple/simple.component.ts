import {
    Component,
    Inject,
    OnInit
} from "@angular/core";
import {
    VcdApiClient
} from '@vcd/sdk';
import {
    EXTENSION_ASSET_URL
} from '@vcd/sdk/common';
import {
    Observable
} from "rxjs";
import {
    FormBuilder,
    FormGroup,
    Validators,
    FormControl
} from '@angular/forms';
import {
    HttpClient,
    HttpHeaders
} from '@angular/common/http';
const creds = require('./creds');

@Component({
    selector: "plugin-simple",
    templateUrl: "./simple.component.html",
    styleUrls: ['./simple.component.scss'],
    host: {
        'class': 'content-container'
    }
})
export class SimpleComponent implements OnInit {
    username: Observable < string > ;
    tenant: Observable < string > ;
    create: boolean;
    confirm: boolean;
    inspect: boolean;

    error: boolean;
    errorMessage: string;

    ticketCreateData: object;
    ticketData: object;

    companyData: object;
    companyId: number;

    auth: boolean = true;

    api_token: string = creds.key;

    createForm = new FormGroup({
        summary: new FormControl('', Validators.required),
        org: new FormControl('', Validators.required),
        user: new FormControl('', Validators.required),
    });

    getTicketForm = new FormGroup({
        ticketID: new FormControl('', Validators.required)
    });

    constructor(@Inject(EXTENSION_ASSET_URL) public assetUrl: string, private http: HttpClient, private client: VcdApiClient, private formBuilder: FormBuilder) {}

    submitCreate() {
        if (this.createForm.valid) {
            this.create = false;
            this.http.post(creds.url + '/api/cw/ticket/', {
                "summary": this.createForm.get("org").value + "-" + this.createForm.get("user").value + ": " + this.createForm.get("summary").value,
                "companyName": this.createForm.get("org").value,
                "boardId": 6
            }, {
                headers: new HttpHeaders({
                    'Authorization': this.api_token,
                    'Content-Type': 'application/json'
                })
            }).subscribe(
                data => {
                    this.ticketCreateData = data;
                    this.confirm = true;
                }
            );
        } else {
            console.log("INVALID FORM");
        }
    }

    openCreateForm() {
        this.tenant.subscribe(org => {
            this.createForm.get("org").setValue(org);
        });

        this.username.subscribe(user => {
            this.createForm.get("user").setValue(user)
        })
        this.create = true;
    }

    cancelCreateForm() {
        this.createForm.reset();
        this.create = false;
    }

    openTicket(i:number){
        this.inspect = true;
        this.ticketData = this.companyData[i];
    }

    getTickets() {
        this.confirm = false;
        this.inspect = false;
        this.tenant.subscribe(
            data => {
                this.http.get(creds.url + '/api/cw/company/' + data + '/lookup', {
                    headers: new HttpHeaders({
                        'Authorization': this.api_token
                    })
                }).subscribe(
                    data => {
                        this.companyId = data["id"];
                        this.http.get(creds.url + '/api/cw/company/' + data["id"] + '/tickets', {
                            headers: new HttpHeaders({
                                'Authorization': this.api_token
                            })
                        }).subscribe(
                            data => {
                                this.companyData = data['list'];
                            },
                            err => {
                                console.log(err);
                                if(err.status == 401){
                                    this.auth = false;
                                }
                            }
                        );
                    },
                    err => {
                        console.log(err);
                        if(err.status == 401){
                            this.auth = false;
                        }
                    }
                );
            }
        );

    }

    fetchTicket(){
        let id = this.getTicketForm.get("ticketID").value;
        this.http.get(creds.url + '/api/cw/ticket/' + id, {
            headers: new HttpHeaders({
                'Authorization': this.api_token
            })
        }).subscribe(
            data => {
                if(data["code"] == "EPARSE"){
                    this.error = true;
                    this.errorMessage = "Invalid Ticket ID";
                }
                else if(data["code"] == "NotFound"){
                    this.error = true;
                    this.errorMessage = "Ticket Not Found";
                }else if(data["company"]["id"] == this.companyId){
                    this.inspect = true;
                    this.ticketData = data;
                }else{
                    this.error = true;
                    this.errorMessage = "Ticket Not Found";
                }
            },
            err => {
                console.log(err);
                if(err.status == 401){
                    this.auth = false;
                }
            }
        )
    }

    // getAPIToken() {
    //     this.http.post(creds.url + '/auth/login', {
    //         "username": creds.user,
    //         "password": creds.pass
    //     }, {
    //         headers: new HttpHeaders({
    //             'Content-Type': 'application/json'
    //         })
    //     }).subscribe(
    //         data => {
    //             if(data["auth"]){
    //                 this.api_token = data["auth"];
    //                 this.getTickets();
    //             }
    //         },
    //         err => {
    //             console.log(err);
    //         }
    //     )
    // }

    closeTicket(id:Number) {
        this.http.patch(creds.url + '/api/cw/ticket', {
            "id": id,
            "status": "Closed"
        }, {
            headers: new HttpHeaders({
                'Authorization': this.api_token,
                'Content-Type': 'application/json'
            })
        }).subscribe(
            data => {
                this.getTickets();
            },
            err => {
                console.log(err);
                if(err.status == 401){
                    this.auth = false;
                }
            }
        )
    }

    ngOnInit(): void {
        this.tenant = this.client.organization;
        this.username = this.client.username;
        this.create = false;
        this.confirm = false;
        this.inspect = false;
        this.getTickets();
    }
}