import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSubjectDto } from './dto/create-subject-dto';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';
import * as sgmail from '@sendgrid/mail';
import { EmailData } from "@sendgrid/helpers/classes/email-address";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<
    | User
    | {
        statusCode: number;
        message: string;
      }
  > {
    if (!createUserDto.email || !this.isValidEmail(createUserDto.email)) {
      return {
        statusCode: 400,
        message: 'Invalid email',
      };
    }

    if(!await this.isAvailable(createUserDto.email)) {
      return {
        statusCode: 400,
        message: 'Email already exists',
      };
    }

    return new this.userModel(createUserDto).save();
  }

  findAll() {
    return this.userModel.find();
  }

  async remove(email: string):Promise<void | {
    statusCode: number;
    message: string;
  }>{
    if(await this.isAvailable(email)) {
      return {
        statusCode: 400,
        message: 'Email does not exists in the database',
      };
    }else{
      await this.userModel.deleteOne({ email });
    }
  }

  send(createSubjectDto: CreateSubjectDto){
    this.sendEmail(createSubjectDto);
  }

  private isValidEmail(emailAdress: string): boolean {
    let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    
    if (emailAdress.match(regexEmail)) {
      return true;
    } else {
      return false;
    }
  }

  private async isAvailable(email: string): Promise<boolean> {
    const data = await this.findAll();

    for (let user of data) {
      if(email === user.email){
        return false;
      }
    }
    return true;
  }

  private async sendEmail(textToSend: CreateSubjectDto): Promise<void>{
    const API_KEY = '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';
    sgmail.setApiKey(API_KEY);
    const messageFrom = 'sayfo.mehmedov@gmail.com';
    let messageTo = await this.getUsersEmails();

    let messageToSend: sgmail.MailDataRequired = {
      "to": messageTo,
      "from": messageFrom,
      "subject": textToSend.subject,
      "text": textToSend.text
    };
    
    sgmail.sendMultiple(messageToSend);
  }

  private async getUsersEmails():Promise<EmailData[]>{
    const users = await this.findAll();
    let usersEmails: string[] = [];

    for (let user of users) {
      usersEmails.push(user.email);
    }
    return usersEmails;
  }
}
